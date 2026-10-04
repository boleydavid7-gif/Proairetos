import { onRemoteChanges, syncSoon } from '../../app/sync/syncController';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';
import type { Drink, HydrosSettings } from '../core/drinks';
import { defaultHydrosSettings } from '../core/drinks';

export type { HydrosSettings } from '../core/drinks';

const DRINKS = stores.hydrosDrinks;
const SETTINGS = 'hydros:settings';
const memory = new Map<string, Drink>();
let opened: Promise<IDBDatabase | undefined> | undefined;
let version = 0;
const listeners = new Set<() => void>();

function db(): Promise<IDBDatabase | undefined> {
  opened ??= openDatabase().catch(() => undefined);
  return opened;
}

function notify(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const storeVersion = () => version;

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await db();
  if (!database) throw new Error('No database');
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(DRINKS, mode);
    const request = work(transaction.objectStore(DRINKS));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function listDrinks(): Promise<Drink[]> {
  if (!(await db())) return [...memory.values()];
  return run('readonly', (store) => store.getAll() as IDBRequest<Drink[]>);
}

export async function putDrink(drink: Drink): Promise<void> {
  if (await db()) await run('readwrite', (store) => store.put(drink));
  else memory.set(drink.id, drink);
  notify();
  syncSoon();
}

export async function removeDrink(id: string): Promise<void> {
  if (await db()) await run('readwrite', (store) => store.delete(id));
  else memory.delete(id);
  notify();
  syncSoon();
}

export function loadSettings(): HydrosSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS) ?? '{}') as Partial<HydrosSettings>;
    return {
      ...defaultHydrosSettings(),
      ...saved,
      goalOz: Number.isFinite(saved.goalOz) ? Math.max(1, Number(saved.goalOz)) : defaultHydrosSettings().goalOz,
      usualMinOz: Number.isFinite(saved.usualMinOz) ? Math.max(1, Number(saved.usualMinOz)) : defaultHydrosSettings().usualMinOz,
      usualMaxOz: Number.isFinite(saved.usualMaxOz) ? Math.max(1, Number(saved.usualMaxOz)) : defaultHydrosSettings().usualMaxOz,
    };
  } catch {
    return defaultHydrosSettings();
  }
}

export function saveSettings(settings: HydrosSettings): void {
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(settings));
  } catch {
    // The next render still has the in-memory setting.
  }
  notify();
}

export function startStore(): void {
  onRemoteChanges(notify);
}
