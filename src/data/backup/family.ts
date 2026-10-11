import { stores } from '../storage/indexeddb/database';

/**
 * The other apps in the family, in the same backup as Proairetos: Askesis's
 * workouts and plan, SOMA's recipes and grocery list, Oikonomia's bills, and HYDROS's drinks (all in the
 * Proairetos database), and the settings of the family apps, which
 * live in this browser's storage. One file holds everything; whichever app
 * makes it, restoring it brings the family apps back.
 *
 * Left out on purpose: the sign-in session, things that are fetched again
 * (other calendars' events, the weather), drafts and running timers, the
 * calendar subscription's server link, and songs added to Askesis (large
 * files from the phone).
 */
export type FamilyData = {
  askesis?: { workouts: unknown[]; plans: unknown[] };
  soma?: { recipes: unknown[]; groceries: unknown[] };
  oikonomia?: { bills: unknown[]; budgets?: unknown[] };
  hydros?: { drinks: unknown[] };
  theoria?: { books: unknown[]; notebooks?: unknown[] };
  /** Settings by key, as stored. */
  settings?: Record<string, string>;
};

const PREFIXES = ['proairetos.', 'askesis:', 'soma:', 'oikonomia:', 'hydros:', 'theoria:', 'diaita:', 'philia:', 'ergon:'];
const LEFT_OUT = new Set([
  'proairetos.auth',
  'proairetos.lastBackup',
  'proairetos.lastVisit',
  'proairetos.focusSession',
  'proairetos.weather.now',
  'proairetos.calendarFeed',
  'proairetos.journalDraft',
  // The passcode belongs to this device only.
  'proairetos.lock',
  'askesis:startTest',
]);

/** Whether a stored setting belongs in a backup. */
export function keptInBackup(key: string): boolean {
  if (!PREFIXES.some((prefix) => key.startsWith(prefix))) return false;
  if (LEFT_OUT.has(key)) return false;
  // Other calendars' events are fetched again from their links; the links themselves are kept.
  if (key.startsWith('proairetos.otherCalendars.')) return false;
  return true;
}

export function settingsSnapshot(storage: Storage = localStorage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && keptInBackup(key)) out[key] = storage.getItem(key) ?? '';
  }
  return out;
}

/** Puts settings back: the ones in the backup replace those here; ones it does not have are left as they are. */
export function restoreSettings(settings: Record<string, string>, storage: Storage = localStorage): void {
  for (const [key, value] of Object.entries(settings)) {
    if (!keptInBackup(key) || typeof value !== 'string') continue;
    try {
      storage.setItem(key, value);
    } catch {
      // Storage full or blocked: the data is back, a setting may not be.
    }
  }
}

// ---------- The databases ----------

function request<T>(work: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    work.onsuccess = () => resolve(work.result);
    work.onerror = () => reject(work.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** The first SOMA's own database (before its records moved into the Proairetos database). */
export function openSoma(factory: IDBFactory = indexedDB): Promise<IDBDatabase | undefined> {
  return new Promise((resolve) => {
    try {
      const open = factory.open('soma', 1);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains('recipes')) open.result.createObjectStore('recipes', { keyPath: 'id' });
        if (!open.result.objectStoreNames.contains('groceries')) open.result.createObjectStore('groceries', { keyPath: 'id' });
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

async function readAll(db: IDBDatabase, store: string): Promise<unknown[]> {
  if (!db.objectStoreNames.contains(store)) return [];
  return request(db.transaction(store, 'readonly').objectStore(store).getAll());
}

async function replaceStore(db: IDBDatabase, store: string, records: unknown[]): Promise<void> {
  if (!db.objectStoreNames.contains(store)) return;
  const tx = db.transaction(store, 'readwrite');
  const target = tx.objectStore(store);
  target.clear();
  for (const record of records) target.put(record);
  await done(tx);
}

export async function gatherFamily(proairetos: IDBDatabase | null | undefined): Promise<FamilyData> {
  const out: FamilyData = { settings: settingsSnapshot() };
  if (proairetos) {
    out.askesis = { workouts: await readAll(proairetos, stores.askesisWorkouts), plans: await readAll(proairetos, stores.askesisPlans) };
    out.soma = { recipes: await readAll(proairetos, stores.somaRecipes), groceries: await readAll(proairetos, stores.somaGroceries) };
    out.oikonomia = { bills: await readAll(proairetos, stores.oikonomiaBills), budgets: await readAll(proairetos, stores.oikonomiaBudgets) };
    out.hydros = { drinks: await readAll(proairetos, stores.hydrosDrinks) };
    out.theoria = { books: await readAll(proairetos, stores.theoriaBooks), notebooks: await readAll(proairetos, stores.theoriaNotebooks) };
  }
  return out;
}

/** Brings the family back from a backup: each app's part only if the file has it (older backups have none). */
export async function restoreFamily(data: FamilyData, proairetos: IDBDatabase | null | undefined): Promise<void> {
  if (proairetos && data.askesis) {
    await replaceStore(proairetos, stores.askesisWorkouts, data.askesis.workouts ?? []);
    await replaceStore(proairetos, stores.askesisPlans, data.askesis.plans ?? []);
  }
  if (proairetos && data.soma) {
    await replaceStore(proairetos, stores.somaRecipes, data.soma.recipes ?? []);
    await replaceStore(proairetos, stores.somaGroceries, data.soma.groceries ?? []);
  }
  if (proairetos && data.oikonomia) {
    await replaceStore(proairetos, stores.oikonomiaBills, data.oikonomia.bills ?? []);
    // Budgets were added after bills. An older family backup must leave any
    // newer plans on this device alone.
    if (data.oikonomia.budgets !== undefined) await replaceStore(proairetos, stores.oikonomiaBudgets, data.oikonomia.budgets);
  }
  if (proairetos && data.hydros) await replaceStore(proairetos, stores.hydrosDrinks, data.hydros.drinks ?? []);
  if (proairetos && data.theoria) {
    await replaceStore(proairetos, stores.theoriaBooks, data.theoria.books ?? []);
    if (data.theoria.notebooks !== undefined) await replaceStore(proairetos, stores.theoriaNotebooks, data.theoria.notebooks);
  }
  if (data.settings) restoreSettings(data.settings);
}
