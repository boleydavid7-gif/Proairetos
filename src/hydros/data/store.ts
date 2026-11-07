import { onRemoteChanges, syncSoon } from '../../app/sync/syncController';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';
import type { Drink, HydrosActivity, HydrosSettings, HydrosUnit } from '../core/drinks';
import { defaultHydrosSettings, normalizeDrinkProfiles, normalizeGlasses, OLD_DEFAULT_CREDIT, type HydrosDrinkProfile } from '../core/drinks';
import { notifications } from '../../app/notify/notifications';

export type { HydrosSettings } from '../core/drinks';

const DRINKS = stores.hydrosDrinks;
const SETTINGS = 'hydros:settings';
const SETTINGS_FORMAT = 'hydros:settings-format';
const CURRENT_SETTINGS_FORMAT = '3';
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
    let result: T;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Hydros storage transaction was aborted.'));
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
  // Reminders count from the last drink, so they are worked out again.
  notifications.refreshSoon();
}

export async function removeDrink(id: string): Promise<void> {
  if (await db()) await run('readwrite', (store) => store.delete(id));
  else memory.delete(id);
  notify();
  syncSoon();
  notifications.refreshSoon();
}

export function loadSettings(): HydrosSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS) ?? '{}') as Partial<HydrosSettings>;
    // The original Hydros default was 72 oz and there was no settings screen
    // to explicitly choose it. Treat that legacy value as the old default,
    // while preserving a deliberate 72 oz choice made in the new settings UI.
    const format = localStorage.getItem(SETTINGS_FORMAT);
    const legacyDefault = format !== '2' && format !== CURRENT_SETTINGS_FORMAT && saved.goalOz === 72;
    // Before format 3, drink types were saved whole with the old partial credit for coffee, tea and the rest.
    // A type still at its old default now counts in full; one the person changed keeps their number.
    const profiles = normalizeDrinkProfiles(saved.drinkProfiles).map((profile: HydrosDrinkProfile) =>
      format !== CURRENT_SETTINGS_FORMAT && OLD_DEFAULT_CREDIT[profile.id] === profile.hydrationCoefficient ? { ...profile, hydrationCoefficient: 1 } : profile);
    const unit = saved.unit === 'ml' || saved.unit === 'L' ? saved.unit as HydrosUnit : 'oz';
    return {
      ...defaultHydrosSettings(),
      ...saved,
      goalOz: legacyDefault ? defaultHydrosSettings().goalOz : Number.isFinite(saved.goalOz) ? Math.max(1, Number(saved.goalOz)) : defaultHydrosSettings().goalOz,
      goalChosen: saved.goalChosen === true || (Number.isFinite(saved.goalOz) && saved.goalOz !== defaultHydrosSettings().goalOz),
      usualMinOz: Number.isFinite(saved.usualMinOz) ? Math.max(1, Number(saved.usualMinOz)) : defaultHydrosSettings().usualMinOz,
      usualMaxOz: Number.isFinite(saved.usualMaxOz) ? Math.max(1, Number(saved.usualMaxOz)) : defaultHydrosSettings().usualMaxOz,
      weightLb: Number.isFinite(saved.weightLb) && Number(saved.weightLb) > 0 ? Number(saved.weightLb) : undefined,
      heightIn: Number.isFinite(saved.heightIn) && Number(saved.heightIn) > 0 ? Number(saved.heightIn) : undefined,
      activity: saved.activity === 'low' || saved.activity === 'moderate' || saved.activity === 'high' ? saved.activity as HydrosActivity : undefined,
      useRecommendedRange: saved.useRecommendedRange === true,
      reminders: saved.reminders === true,
      reminderIntervalMinutes: Number.isFinite(saved.reminderIntervalMinutes) ? Math.max(15, Math.min(240, Math.round(Number(saved.reminderIntervalMinutes)))) : 120,
      reminderWhen: saved.reminderWhen === 'work' ? 'work' : 'waking',
      runDayExtra: saved.runDayExtra !== false,
      unit,
      drinkProfiles: profiles,
      glasses: normalizeGlasses(saved.glasses, unit),
    };
  } catch {
    return defaultHydrosSettings();
  }
}

export function saveSettings(settings: HydrosSettings): void {
  try {
    try {
      localStorage.setItem(SETTINGS, JSON.stringify(settings));
      localStorage.setItem(SETTINGS_FORMAT, CURRENT_SETTINGS_FORMAT);
    } catch {
      // Storage full or blocked: this lasts for this visit only.
    }
  } catch {
    // The next render still has the in-memory setting.
  }
  notify();
}

export function startStore(): void {
  onRemoteChanges(notify);
}
