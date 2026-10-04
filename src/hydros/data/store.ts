import { onRemoteChanges, syncSoon } from '../../app/sync/syncController';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';
import type { Drink, HydrosActivity, HydrosSettings, HydrosUnit } from '../core/drinks';
import { defaultHydrosSettings } from '../core/drinks';

export type { HydrosSettings } from '../core/drinks';

const DRINKS = stores.hydrosDrinks;
const SETTINGS = 'hydros:settings';
const SETTINGS_FORMAT = 'hydros:settings-format';
const CURRENT_SETTINGS_FORMAT = '2';
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
    // The original Hydros default was 72 oz and there was no settings screen
    // to explicitly choose it. Treat that legacy value as the old default,
    // while preserving a deliberate 72 oz choice made in the new settings UI.
    const legacyDefault = localStorage.getItem(SETTINGS_FORMAT) !== CURRENT_SETTINGS_FORMAT && saved.goalOz === 72;
    return {
      ...defaultHydrosSettings(),
      ...saved,
      goalOz: legacyDefault ? defaultHydrosSettings().goalOz : Number.isFinite(saved.goalOz) ? Math.max(1, Number(saved.goalOz)) : defaultHydrosSettings().goalOz,
      usualMinOz: Number.isFinite(saved.usualMinOz) ? Math.max(1, Number(saved.usualMinOz)) : defaultHydrosSettings().usualMinOz,
      usualMaxOz: Number.isFinite(saved.usualMaxOz) ? Math.max(1, Number(saved.usualMaxOz)) : defaultHydrosSettings().usualMaxOz,
      weightLb: Number.isFinite(saved.weightLb) && Number(saved.weightLb) > 0 ? Number(saved.weightLb) : undefined,
      heightIn: Number.isFinite(saved.heightIn) && Number(saved.heightIn) > 0 ? Number(saved.heightIn) : undefined,
      activity: saved.activity === 'low' || saved.activity === 'moderate' || saved.activity === 'high' ? saved.activity as HydrosActivity : undefined,
      useRecommendedRange: saved.useRecommendedRange === true,
      reminders: saved.reminders === true,
      reminderIntervalMinutes: Number.isFinite(saved.reminderIntervalMinutes) ? Math.max(15, Math.min(240, Math.round(Number(saved.reminderIntervalMinutes)))) : 120,
      unit: saved.unit === 'ml' || saved.unit === 'L' ? saved.unit as HydrosUnit : 'oz',
    };
  } catch {
    return defaultHydrosSettings();
  }
}

export function saveSettings(settings: HydrosSettings): void {
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(settings));
    localStorage.setItem(SETTINGS_FORMAT, CURRENT_SETTINGS_FORMAT);
  } catch {
    // The next render still has the in-memory setting.
  }
  notify();
}

export function startStore(): void {
  onRemoteChanges(notify);
}
