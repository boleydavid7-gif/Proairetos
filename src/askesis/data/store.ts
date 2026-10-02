import type { LogEntry } from '../core/log';
import type { Goal, Level } from '../core/plans';
import type { Unit } from '../core/pace';

/**
 * Everything Askesis keeps, on this device only. Workouts live in their own
 * IndexedDB database ("askesis"); the plan and settings are small and kept
 * in localStorage. Proairetos's own data is never written from here.
 */

export type PlanState = {
  level: Level;
  goal: Goal;
  days: number;
  /** Weekdays the person runs, 0 = Monday. */
  weekdays: number[];
  /** The plan week in use. */
  week: number;
  /** The Monday that plan week began on, so a new calendar week can offer the next. */
  weekOf: string;
  /** Sessions moved to another day this week: workout id -> date. */
  moves: Record<string, string>;
  startedOn: string;
};

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
};

const SETTINGS = 'askesis:settings';
const PLAN = 'askesis:plan';

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

export function loadPlan(): PlanState | undefined {
  return readJson<PlanState>(PLAN);
}

export function savePlan(next: PlanState | undefined): void {
  writeJson(PLAN, next);
  notify();
}

// ---------- Workouts (IndexedDB) ----------

const DB = 'askesis';
const STORE = 'entries';
let opening: Promise<IDBDatabase> | undefined;
/** When IndexedDB is unavailable, workouts are kept for this visit only. */
let memory: Map<string, LogEntry> | undefined;

function open(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = factory.open(DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('date', 'date');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return opening;
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function fallback(): Promise<Map<string, LogEntry> | undefined> {
  if (memory) return memory;
  try {
    await open();
    return undefined;
  } catch {
    memory = new Map();
    return memory;
  }
}

export async function listEntries(): Promise<LogEntry[]> {
  const kept = await fallback();
  if (kept) return [...kept.values()];
  return withStore('readonly', (store) => store.getAll() as IDBRequest<LogEntry[]>);
}

export async function putEntry(entry: LogEntry): Promise<void> {
  const kept = await fallback();
  if (kept) kept.set(entry.id, entry);
  else await withStore('readwrite', (store) => store.put(entry));
  notify();
}

export async function deleteEntry(id: string): Promise<void> {
  const kept = await fallback();
  if (kept) kept.delete(id);
  else await withStore('readwrite', (store) => store.delete(id));
  notify();
}

export async function clearEntries(): Promise<void> {
  const kept = await fallback();
  if (kept) kept.clear();
  else await withStore('readwrite', (store) => store.clear());
  notify();
}

/** For tests: a fresh database factory. */
export function useFactory(factory: IDBFactory): void {
  opening = undefined;
  memory = undefined;
  void open(factory);
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
