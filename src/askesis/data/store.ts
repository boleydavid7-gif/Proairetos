import { onRemoteChanges, syncSoon } from '../../app/sync/syncController';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';
import type { LogEntry } from '../core/log';
import type { Aim } from '../core/plans';
import type { Unit } from '../core/pace';

/**
 * Everything Askesis keeps. Workouts and the plan in use live in the
 * Proairetos database on this device (stores `askesisWorkouts` and
 * `askesisPlans`), so they sync, sealed, with the same account and key as
 * Proairetos: signing in there covers both. Settings stay on this device.
 * Askesis never reads or writes Proairetos's own records except the
 * schedule, read only.
 */

export type PlanState = {
  /** What the person is aiming for, in their terms. */
  aim: Aim;
  /** The aim in their own words, if they gave any ("the river loop"). */
  aimWords?: string;
  days: number;
  /** Weekdays the person runs, 0 = Monday. */
  weekdays: number[];
  /** The runner's own week: 1 is where they began, whatever their level. */
  week: number;
  /** The week of the full path that is their week 1 (lower than 1 after a path was made more gradual partway). */
  joinWeek: number;
  /** Weeks are counted from the runner's own week 1 (older plans counted from the path's first week). */
  numbering?: 'own';
  /** Walking weeks before the walk-run. */
  walkFirst?: boolean;
  /** Weeks taken again in a row, so a more gradual path can be offered. */
  again?: number;
  /** About how many weeks to the aim when the path began. */
  startWeeks?: number;
  /** The Monday that week began on, so a new calendar week can offer the next. */
  weekOf: string;
  /** Sessions moved to another day this week: workout id -> date. */
  moves: Record<string, string>;
  startedOn: string;
  /** Slower growth. */
  gentler?: boolean;
  /** A race or event date the path counts back to. */
  raceDate?: string;
  /** A session made lighter, for that day only. */
  lighter?: { date: string; workoutId: string };
  /** The last workout date when coming back was offered, so it is asked once. */
  comeBackAsked?: string;
  /** The Compass goal this path is linked to, if the person added one. */
  goalId?: string;
  /** A week of rest the person chose, by its Monday: nothing planned. */
  restWeek?: string;
  /** Why this matters to them, in their words; shown back at the start of a week and before a run. */
  why?: string;
  /** Their usual time on run days ("06:30"), for the session and its reminder. */
  runAt?: string;
  /** Where they usually run. */
  place?: string;
  /** Their own plan for when something gets in the way ("walk it instead"). */
  ifThen?: string;
};

type OldPlanState = { level?: 'beginner' | 'intermediate' | 'advanced'; goal?: string; week: number };

/** Plans from before paths (a level and a goal) become the matching aim and point on the path. */
export function fromOldPlan(record: Partial<PlanState> & OldPlanState): PlanState {
  if (record.aim) {
    const state = { joinWeek: 1, ...record } as PlanState;
    if (state.numbering === 'own') return state;
    // Weeks used to count from the path's first week; now week 1 is where the runner began.
    return { ...state, week: Math.max(1, state.week - state.joinWeek + 1), numbering: 'own' };
  }
  const aim: Aim =
    record.level === 'intermediate'
      ? { kind: 'distance', meters: 10000 }
      : record.level === 'advanced'
        ? { kind: 'distance', meters: record.goal === 'marathon' ? 42195 : 21097.5 }
        : { kind: 'time', minutes: 30 };
  const beginner = record.level === 'beginner' || !record.level;
  const { level: _l, goal: _g, ...rest } = record;
  return { ...(rest as PlanState), aim, week: record.week, joinWeek: beginner ? 1 : 11, numbering: 'own' };
}

export type Settings = {
  unit: Unit;
  voice: boolean;
  bells: boolean;
  keepAwake: boolean;
  /** Read the Proairetos schedule on this device to mark days after nights. */
  readSchedule: boolean;
  age?: number;
  maxHr?: number;
  restingHr?: number;
  /** Seen the welcome and chosen a plan. */
  started: boolean;
  /** Read the before-you-start note. */
  safetySeen: boolean;
  /** After saving a workout: a minute to cool down and a line for Reflect. */
  afterOffers: boolean;
  /** The day's Stoic line on Home. */
  dailyLine: boolean;
  /** Music during a guided session: none, songs kept in Askesis, or another app's (which mixes, screen on). */
  music: 'none' | 'mine' | 'other';
  /** Songs in a new order each time. */
  shuffle: boolean;
};

const SETTINGS = 'askesis:settings';
const OLD_PLAN = 'askesis:plan';
const PLAN_ID = 'current';

function readJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing: the session still works, it is just not kept.
  }
}

const usesMiles = () => {
  try {
    return /^en-(US|LR|MM)$/i.test(navigator.language) || navigator.language === 'en-GB';
  } catch {
    return false;
  }
};

export const defaultSettings = (): Settings => ({
  unit: usesMiles() ? 'mi' : 'km',
  voice: true,
  bells: true,
  keepAwake: true,
  readSchedule: true,
  started: false,
  safetySeen: false,
  afterOffers: true,
  dailyLine: true,
  music: 'none',
  shuffle: true,
});

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadSettings(): Settings {
  return { ...defaultSettings(), ...readJson<Partial<Settings>>(SETTINGS) };
}

export function saveSettings(next: Settings): void {
  writeJson(SETTINGS, next);
  notify();
}

// ---------- The shared database ----------

let database: Promise<IDBDatabase | undefined> | undefined;
/** When IndexedDB is unavailable, everything is kept for this visit only. */
const memory = { entries: new Map<string, LogEntry>(), plan: undefined as (PlanState & { id: string }) | undefined };

function db(): Promise<IDBDatabase | undefined> {
  database ??= openDatabase().catch(() => undefined);
  return database;
}

function run<T>(store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (handle) =>
      new Promise<T>((resolve, reject) => {
        const transaction = handle!.transaction(store, mode);
        const request = work(transaction.objectStore(store));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

// ---------- The plan ----------

let plan: PlanState | undefined;

/** The plan in use, read once at start and kept current. */
export function loadPlan(): PlanState | undefined {
  return plan;
}

export function savePlan(next: PlanState | undefined): void {
  plan = next;
  notify();
  void (async () => {
    if (!(await db())) {
      memory.plan = next && { ...next, id: PLAN_ID };
      return;
    }
    if (next) await run(stores.askesisPlans, 'readwrite', (s) => s.put({ ...next, id: PLAN_ID }));
    else await run(stores.askesisPlans, 'readwrite', (s) => s.delete(PLAN_ID));
    syncSoon();
  })().catch(() => undefined);
}

async function readPlan(): Promise<PlanState | undefined> {
  if (!(await db())) return memory.plan;
  const record = await run<(PlanState & { id: string }) | undefined>(stores.askesisPlans, 'readonly', (s) => s.get(PLAN_ID));
  if (!record) return undefined;
  const { id: _id, ...rest } = record;
  return fromOldPlan(rest as PlanState & { week: number });
}

// ---------- Workouts ----------

export async function listEntries(): Promise<LogEntry[]> {
  if (!(await db())) return [...memory.entries.values()];
  return run(stores.askesisWorkouts, 'readonly', (s) => s.getAll() as IDBRequest<LogEntry[]>);
}

export async function putEntry(entry: LogEntry): Promise<void> {
  if (!(await db())) memory.entries.set(entry.id, entry);
  else await run(stores.askesisWorkouts, 'readwrite', (s) => s.put(entry));
  notify();
  syncSoon();
}

export async function deleteEntry(id: string): Promise<void> {
  if (!(await db())) memory.entries.delete(id);
  else await run(stores.askesisWorkouts, 'readwrite', (s) => s.delete(id));
  notify();
  syncSoon();
}

export async function clearEntries(): Promise<void> {
  if (!(await db())) memory.entries.clear();
  else await run(stores.askesisWorkouts, 'readwrite', (s) => s.clear());
  notify();
  syncSoon();
}

// ---------- Start ----------

/** The first Askesis kept its own database; anything there moves into the shared one, once. */
async function moveFromOldDatabase(): Promise<void> {
  const old = await new Promise<IDBDatabase | undefined>((resolve) => {
    try {
      const request = indexedDB.open('askesis');
      request.onupgradeneeded = () => request.transaction?.abort();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
  if (!old) return;
  const entries = old.objectStoreNames.contains('entries')
    ? await new Promise<LogEntry[]>((resolve) => {
        const request = old.transaction('entries', 'readonly').objectStore('entries').getAll();
        request.onsuccess = () => resolve(request.result as LogEntry[]);
        request.onerror = () => resolve([]);
      })
    : [];
  old.close();
  for (const entry of entries) await run(stores.askesisWorkouts, 'readwrite', (s) => s.put(entry));
  indexedDB.deleteDatabase('askesis');
}

/** Opens storage, brings over anything from the first version, and listens for synced changes. */
export async function startStore(): Promise<void> {
  if (await db()) {
    await moveFromOldDatabase().catch(() => undefined);
    const oldPlan = readJson<PlanState>(OLD_PLAN);
    if (oldPlan && !(await readPlan())) await run(stores.askesisPlans, 'readwrite', (s) => s.put({ ...fromOldPlan(oldPlan as PlanState & { week: number }), id: PLAN_ID }));
    writeJson(OLD_PLAN, undefined);
  }
  plan = await readPlan().catch(() => undefined);
  onRemoteChanges(() => {
    void readPlan().then((next) => {
      plan = next;
      notify();
    });
  });
}

// ---------- Backup ----------

export type Backup = { app: 'askesis'; version: 1; exportedAt: string; settings: Settings; plan?: PlanState; entries: LogEntry[] };

export async function exportAll(): Promise<Backup> {
  return {
    app: 'askesis',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    plan: loadPlan(),
    entries: await listEntries(),
  };
}

export function readBackup(text: string): Backup {
  const data = JSON.parse(text) as Partial<Backup>;
  if (data.app !== 'askesis' || !Array.isArray(data.entries) || !data.settings)
    throw new Error('That file is not an Askesis backup.');
  return data as Backup;
}

/** Puts a backup back: its workouts join the ones here (same id replaces), and its plan and settings are used. */
export async function restore(backup: Backup): Promise<void> {
  for (const entry of backup.entries) await putEntry(entry);
  saveSettings({ ...defaultSettings(), ...backup.settings, started: true });
  savePlan(backup.plan);
}
