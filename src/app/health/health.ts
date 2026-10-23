import { deleteHealthInbox, deleteHealthItems, fetchHealthInbox, fetchHealthItems, saveHealthInbox } from '../../data/sync/supabase';
import { currentUserId, openWithAccount, sealWithAccount, syncStatus } from '../sync/syncController';
import { openSealed } from '../capture/inbox';
import { API_BASE } from '../apiBase';
import { isAdded } from '../family/added';
import { emptyBatch, readHealthExport, type HealthBatch } from '../../core/health/autoExport';

/*
 * Apple Health through Health Auto Export. Turning it on makes a key pair and a token on this device; the server gets
 * the public half, the token's hash, and the pair sealed with the account's own key (so every app and device signed in
 * to the account can open what arrives, and the server cannot). Health Auto Export posts to /api/health/<token>; the
 * Worker seals what the apps keep. Any of Proairetos, Askesis, Hydros or the newer apps opens the waiting parts on start,
 * on sync and on coming into view, adds what is new to the apps that are added, and deletes the parts.
 */

/** The person's choices (synced): which apps take what. Present while it is on. */
const CHOICES = 'proairetos.health';
/** This device's copy of the token and private key (device only, out of backups and sync). */
const HERE = 'proairetosHealthKey';

export type HealthChoices = { workouts: boolean; sleep: boolean; water: boolean; readings: boolean };
type Kept = { token: string; privateJwk: JsonWebKey };

export const HEALTH_PARTS: { id: keyof HealthChoices; app: string; title: string; what: string }[] = [
  { id: 'workouts', app: 'askesis', title: 'Workouts to Askesis', what: 'Runs, walks, hikes and rides' },
  { id: 'sleep', app: 'diaita', title: 'Sleep to Diaita', what: 'When you went to sleep and woke up' },
  { id: 'water', app: 'hydros', title: 'Water to Hydros', what: 'Water logged in other apps' },
  { id: 'readings', app: 'therapeia', title: 'Readings to Therapeia', what: 'Weight, blood pressure, blood sugar, temperature, resting heart rate, oxygen' },
];

export function healthChoices(): HealthChoices | undefined {
  try {
    const raw = localStorage.getItem(CHOICES);
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as Partial<HealthChoices>;
    return { workouts: saved.workouts !== false, sleep: saved.sleep !== false, water: saved.water !== false, readings: saved.readings !== false };
  } catch {
    return undefined;
  }
}

export function saveHealthChoices(choices: HealthChoices | undefined): void {
  try {
    if (choices) localStorage.setItem(CHOICES, JSON.stringify(choices));
    else localStorage.removeItem(CHOICES);
  } catch {
    // Storage blocked: this lasts for this visit.
  }
}

export const healthAddress = (token: string) => `${API_BASE || (typeof location === 'undefined' ? 'https://proairetos.com' : location.origin)}/api/health/${token}`;

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const randomToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

function keptHere(): Kept | undefined {
  try {
    const raw = localStorage.getItem(HERE);
    return raw ? (JSON.parse(raw) as Kept) : undefined;
  } catch {
    return undefined;
  }
}

/** The token and key: this device's copy, else the account's sealed copy (another device turned it on). */
export async function healthKey(): Promise<Kept | undefined> {
  const here = keptHere();
  if (here) return here;
  if (syncStatus.get().phase !== 'ready') return undefined;
  const row = await fetchHealthInbox();
  if (!row) return undefined;
  const opened = await openWithAccount('health-key', fromBase64(row.sealed_key).buffer as ArrayBuffer);
  if (!opened) return undefined;
  const kept = JSON.parse(new TextDecoder().decode(opened)) as Kept;
  try {
    localStorage.setItem(HERE, JSON.stringify(kept));
  } catch {
    // Opened again next time.
  }
  return kept;
}

/** Makes the address (or a new one, which stops the old). Signed in only. */
export async function turnOnHealth(): Promise<Kept> {
  const userId = currentUserId();
  if (!userId || syncStatus.get().phase !== 'ready') throw new Error('Sign in and open your data first, in Account and sync.');
  const pair = (await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  )) as CryptoKeyPair;
  const kept: Kept = { token: randomToken(), privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey) };
  const sealed = await sealWithAccount('health-key', new TextEncoder().encode(JSON.stringify(kept)).buffer as ArrayBuffer);
  if (!sealed) throw new Error('Sign in and open your data first, in Account and sync.');
  const tokenHash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(kept.token)));
  await saveHealthInbox(userId, tokenHash, await crypto.subtle.exportKey('jwk', pair.publicKey), base64(sealed.sealed));
  localStorage.setItem(HERE, JSON.stringify(kept));
  if (!healthChoices()) saveHealthChoices({ workouts: true, sleep: true, water: true, readings: true });
  return kept;
}

export async function turnOffHealth(): Promise<void> {
  const userId = currentUserId();
  if (userId) await deleteHealthInbox(userId);
  localStorage.removeItem(HERE);
  saveHealthChoices(undefined);
}

export type BroughtIn = { counts: { workouts: number; sleep: number; water: number; readings: number }; undo: () => Promise<void> };

/** One of each: the last one sent wins (a day's water total that grew, a night written again). */
function latestOnly(batch: HealthBatch): HealthBatch {
  const last = <T>(list: T[], key: (each: T) => string) => [...new Map(list.map((each) => [key(each), each])).values()];
  return {
    workouts: last(batch.workouts, (each) => each.id),
    sleep: last(batch.sleep, (each) => each.date),
    water: last(batch.water, (each) => each.id),
    readings: last(batch.readings, (each) => each.id),
  };
}

/** Adds what is new in a batch to the apps that are added and chosen. */
export async function applyHealth(sent: HealthBatch, choices: HealthChoices | undefined = healthChoices()): Promise<BroughtIn> {
  const { HEALTH_ID, newWorkouts, nightsToWrite, changedRecords, OZ_PER_ML } = await import('../../core/health/fromHealth');
  const undo: (() => Promise<void> | void)[] = [];
  const counts = { workouts: 0, sleep: 0, water: 0, readings: 0 };
  const now = new Date().toISOString();
  const batch = latestOnly(sent);
  const on = (part: keyof HealthChoices, app: string) => (choices ? choices[part] : true) && isAdded(app);

  if (batch.workouts.length && on('workouts', 'askesis')) {
    const store = await import('../../askesis/data/store');
    const { openSessionOn } = await import('../../askesis/app/strava');
    const log = await store.listEntries();
    const fresh = newWorkouts(batch.workouts, log);
    const session = openSessionOn(log, new Date().toISOString().slice(0, 10));
    const taken = new Set<string>();
    for (const workout of fresh) {
      const linked = workout.type === 'run' || workout.type === 'walk' ? session(workout.date) : undefined;
      const use = linked && !taken.has(linked.id) ? linked : undefined;
      if (use) taken.add(use.id);
      const id = HEALTH_ID + workout.id;
      await store.putEntry({ id, date: workout.date, activity: workout.type as 'run', seconds: workout.seconds, meters: workout.meters, avgHr: workout.avgHr, workoutId: use?.id, workoutTitle: use?.title, createdAt: now });
      undo.push(() => store.deleteEntry(id));
    }
    counts.workouts = fresh.length;
  }

  if (batch.sleep.length && on('sleep', 'diaita')) {
    const { sleeps } = await import('../../diaita/app/state');
    const kept = sleeps.list();
    for (const night of nightsToWrite(batch.sleep, kept)) {
      const before = kept.find((each) => each.date === night.date);
      sleeps.put({ ...before, id: night.date, date: night.date, bed: night.bed, up: night.up, from: 'health' });
      undo.push(() => (before ? sleeps.put(before) : sleeps.remove(night.date)));
      counts.sleep += 1;
    }
  }

  if (batch.water.length && on('water', 'hydros')) {
    const store = await import('../../hydros/data/store');
    const drinks = await store.listDrinks();
    const kept = drinks.map((drink) => ({ id: drink.id, same: (water: { ml: number }) => Math.abs(drink.amountOz - water.ml * OZ_PER_ML) < 0.05 }));
    for (const water of changedRecords(batch.water, kept)) {
      const id = HEALTH_ID + water.id;
      const before = drinks.find((drink) => drink.id === id);
      await store.putDrink({ id, kind: 'water', profileId: 'water', label: 'Apple Health', amountOz: Math.round(water.ml * OZ_PER_ML * 10) / 10, loggedAt: water.at, createdAt: before?.createdAt ?? now });
      undo.push(() => (before ? store.putDrink(before) : store.removeDrink(id)));
      counts.water += 1;
    }
  }

  if (batch.readings.length && on('readings', 'therapeia')) {
    const { readings } = await import('../../therapeia/app/state');
    const list = readings.list();
    const kept = list.map((reading) => ({ id: reading.id, same: (next: { value: number; value2?: number }) => reading.value === next.value && reading.value2 === next.value2 }));
    for (const reading of changedRecords(batch.readings, kept)) {
      const id = HEALTH_ID + reading.id;
      const before = list.find((each) => each.id === id);
      readings.put({ id, kind: reading.kind, value: reading.value, value2: reading.value2, unit: reading.unit, at: reading.at });
      undo.push(() => (before ? readings.put(before) : readings.remove(id)));
      counts.readings += 1;
    }
  }

  return { counts, undo: async () => { for (const step of undo.reverse()) await step(); } };
}

/** A JSON file Health Auto Export saved, brought in by hand. */
export async function bringInHealthFile(file: File): Promise<BroughtIn> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new Error('That file isn’t JSON. Export it from Health Auto Export as JSON.');
  }
  return applyHealth(readHealthExport(json));
}

let opening: Promise<BroughtIn | undefined> | null = null;

/** Opens what is waiting, adds it, and deletes the sealed parts. */
export function openHealthInbox(): Promise<BroughtIn | undefined> {
  if (!healthChoices() || syncStatus.get().phase !== 'ready' || !navigator.onLine) return Promise.resolve(undefined);
  opening ??= (async () => {
    try {
      const kept = await healthKey();
      if (!kept) return undefined;
      const items = await fetchHealthItems();
      if (!items.length) return undefined;
      const batch = emptyBatch();
      const done: string[] = [];
      for (const item of items) {
        try {
          const part = await openSealed<HealthBatch>(kept.privateJwk, item.sealed, 'proairetos-health');
          batch.workouts.push(...(part.workouts ?? []));
          batch.sleep.push(...(part.sleep ?? []));
          batch.water.push(...(part.water ?? []));
          batch.readings.push(...(part.readings ?? []));
          done.push(item.id);
        } catch {
          // Sealed for an earlier address's key: nothing can open it now.
          done.push(item.id);
        }
      }
      // Later parts carry the newer totals for the same day.
      const result = await applyHealth(batch);
      await deleteHealthItems(done);
      return result;
    } finally {
      opening = null;
    }
  })();
  return opening;
}
