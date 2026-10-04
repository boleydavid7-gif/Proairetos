/**
 * A copy of everything, made once a day on this phone, the last seven kept.
 * It is the same backup file as the one saved by hand (the family apps, their
 * settings), so any day can be restored. It guards against mistakes; sync
 * and a saved file guard against losing the phone.
 */
export const DAILY_DB = 'proairetos-daily';
export const KEEP_DAYS = 7;
/** On by default; one switch for the family apps (they share this browser's storage). */
export const DAILY_SETTING = 'proairetos.dailyCopy';

export type DailyCopy = { day: string; savedAt: string; text: string };
export type DailyCopyInfo = Omit<DailyCopy, 'text'> & { size: number };

function open(factory: IDBFactory = indexedDB): Promise<IDBDatabase | undefined> {
  return new Promise((resolve) => {
    try {
      const request = factory.open(DAILY_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('copies', { keyPath: 'day' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

function request<T>(work: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    work.onsuccess = () => resolve(work.result);
    work.onerror = () => reject(work.error);
  });
}

export function dailyCopiesOn(storage: Storage | undefined = globalThis.localStorage): boolean {
  try {
    return storage?.getItem(DAILY_SETTING) !== 'false';
  } catch {
    return true;
  }
}

export function setDailyCopies(on: boolean, storage: Storage = localStorage): void {
  storage.setItem(DAILY_SETTING, on ? 'true' : 'false');
}

/**
 * Makes today's copy if there is none yet: `make` returns the backup's text,
 * or undefined when there is nothing worth keeping. Older copies beyond the
 * last seven days are let go.
 */
export async function keepToday(today: string, make: () => Promise<string | undefined>, factory?: IDBFactory): Promise<boolean> {
  const db = await open(factory);
  if (!db) return false;
  const store = (mode: IDBTransactionMode) => db.transaction('copies', mode).objectStore('copies');
  if (await request(store('readonly').get(today))) return false;
  const text = await make();
  if (!text) return false;
  await request(store('readwrite').put({ day: today, savedAt: new Date().toISOString(), text } satisfies DailyCopy));
  const days = ((await request(store('readonly').getAllKeys())) as string[]).sort();
  for (const day of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) await request(store('readwrite').delete(day));
  return true;
}

/** The copies kept, newest first. */
export async function listCopies(factory?: IDBFactory): Promise<DailyCopyInfo[]> {
  const db = await open(factory);
  if (!db) return [];
  const all = (await request(db.transaction('copies', 'readonly').objectStore('copies').getAll())) as DailyCopy[];
  return all.map(({ text, ...info }) => ({ ...info, size: text.length })).sort((a, b) => b.day.localeCompare(a.day));
}

export async function copyFor(day: string, factory?: IDBFactory): Promise<string | undefined> {
  const db = await open(factory);
  if (!db) return undefined;
  return ((await request(db.transaction('copies', 'readonly').objectStore('copies').get(day))) as DailyCopy | undefined)?.text;
}
