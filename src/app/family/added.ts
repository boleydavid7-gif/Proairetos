import { useSyncExternalStore } from 'react';
import type { FamilyApp } from './FamilyApps';
import { mayUse, subscribePurchases } from './purchases';

/*
 * Proairetos is the main app; the others are added from its Store. What is added is one setting, synced and
 * backed up like the rest. An app that is not added stays out of Proairetos's Today, Days ahead, notifications
 * and search; its records are kept as they are, and the app itself shows Add until it is added again.
 */

export type AddOn = Exclude<FamilyApp, 'proairetos'>;

export const ADD_ONS: readonly AddOn[] = ['askesis', 'soma', 'oikonomia', 'hydros', 'praxis', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton'];

const KEY = 'proairetos.apps';

type Stored = { added: AddOn[] };

/** Signs on this device that an app has been used, for the first decision on a device that had them before. */
const TRACES: Record<AddOn, (key: string) => boolean> = {
  askesis: (key) => key.startsWith('askesis:'),
  soma: (key) => key.startsWith('soma:') || key.startsWith('somaShared.'),
  oikonomia: (key) => key.startsWith('oikonomia:'),
  hydros: (key) => key.startsWith('hydros:'),
  praxis: (key) => key.startsWith('proairetos.praxis'),
  theoria: (key) => key.startsWith('theoria:'),
  diaita: (key) => key.startsWith('diaita:'),
  philia: (key) => key.startsWith('philia:'),
  ergon: (key) => key.startsWith('ergon:') || key.startsWith('ergonShared.'),
  therapeia: (key) => key.startsWith('therapeia:'),
  dynamis: (key) => key.startsWith('dynamis:'),
  ktema: (key) => key.startsWith('ktema:'),
  phyton: (key) => key.startsWith('phyton:'),
};

/** The apps with traces in these storage keys. */
export function usedApps(keys: readonly string[]): AddOn[] {
  return ADD_ONS.filter((app) => keys.some(TRACES[app]));
}

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Stored | undefined } | undefined;

function read(): Stored | undefined {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache?.value;
  }
  if (cache && cache.raw === raw) return cache.value;
  let value: Stored | undefined;
  try {
    const parsed = raw ? (JSON.parse(raw) as Stored) : undefined;
    value = parsed && Array.isArray(parsed.added) ? { added: parsed.added.filter((app) => ADD_ONS.includes(app)) } : undefined;
  } catch {
    value = undefined;
  }
  cache = { raw, value };
  return value;
}

function storageKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key) keys.push(key);
    }
  } catch {
    // No storage: nothing to go on.
  }
  return keys;
}

function write(next: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    cache = { raw: null, value: next };
  }
  listeners.forEach((listener) => listener());
  // Carried to the person's other devices with the next sync.
  void import('../sync/syncController').then((sync) => sync.syncSoon()).catch(() => undefined);
}

/** The added apps; the first time on a device, the ones already used here. */
export function addedApps(): AddOn[] {
  const stored = read();
  if (stored) return stored.added;
  const first = { added: usedApps(storageKeys()) };
  write(first);
  return first.added;
}

/** Added and usable: while the Store takes payments, an add-on also has to be bought (purchases.ts). */
export function isAdded(app: AddOn | string): boolean {
  return !ADD_ONS.includes(app as AddOn) || (addedApps().includes(app as AddOn) && mayUse(app));
}

export function addApp(app: AddOn): void {
  const current = addedApps();
  if (!current.includes(app)) write({ added: [...current, app] });
}

export function removeApp(app: AddOn): void {
  write({ added: addedApps().filter((each) => each !== app) });
}

export function subscribeAdded(listener: () => void): () => void {
  listeners.add(listener);
  const offPurchases = subscribePurchases(listener);
  const onStorage = (event: StorageEvent) => (event.key === KEY || event.key === null) && listener();
  window.addEventListener('storage', onStorage);
  // A change made on another device arrives with sync.
  let offSync: (() => void) | undefined;
  let gone = false;
  void import('../sync/syncController').then((sync) => {
    if (!gone) offSync = sync.onRemoteChanges(listener);
  });
  return () => {
    gone = true;
    offSync?.();
    offPurchases();
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** A string snapshot for React, so screens follow additions and removals at once. */
export function addedSnapshot(): string {
  return addedApps()
    .filter((app) => mayUse(app))
    .join(',');
}

export function useAddedApps(): AddOn[] {
  const snapshot = useSyncExternalStore(subscribeAdded, addedSnapshot);
  return snapshot ? (snapshot.split(',') as AddOn[]) : [];
}
