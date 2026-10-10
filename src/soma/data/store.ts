import type { AisleChoices } from '../core/aisles';
import type { GroceryItem } from '../core/groceries';
import type { Recipe } from '../core/recipes';
import type { UnitSystem } from '../core/ingredients';
import { onRemoteChanges, syncSoon } from '../../app/sync/syncController';
import { openSoma } from '../../data/backup/family';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';

/*
 * SOMA keeps recipes and the grocery list in the Proairetos database on this
 * phone (stores somaRecipes, somaGroceries), so they sync, sealed, with the
 * same account as Proairetos and Askesis. A few settings live in
 * localStorage. Nothing else leaves the phone except a recipe page read
 * through the app's own bridge, and searches sent to TheMealDB for ideas.
 */
const RECIPES = stores.somaRecipes;
const GROCERIES = stores.somaGroceries;
const SETTINGS = 'soma:settings';

export type Settings = {
  started: boolean;
  /** How measured ingredients are shown; recipes remain stored as imported. */
  units: UnitSystem;
  /** The daily line on Home. */
  dailyLine: boolean;
  /** "Ways to try it" beside recipes. */
  waysToTry: boolean;
  /** Things the person usually has, left unticked when adding a recipe's ingredients. */
  usuallyHave: string[];
  /** Aisles the person chose for particular items. */
  aisleChoices: AisleChoices;
  /** Cook mode reads each step aloud. */
  readAloud: boolean;
  /** Cook mode listens for "next" and "back". */
  listen: boolean;
  /** A moment before eating, offered after cooking; at most once a day. */
  pauseBeforeEating: boolean;
  /** The day it was last offered. */
  pauseOfferedOn?: string;
  /** "What fits your day", from the Proairetos schedule. */
  fitsYourDay: boolean;
  /** A thought on what is in season, on Home. */
  seasons: boolean;
};

export const defaultSettings = (): Settings => ({
  started: false,
  units: 'original',
  dailyLine: true,
  waysToTry: true,
  usuallyHave: ['salt', 'black pepper', 'olive oil', 'water'],
  aisleChoices: {},
  readAloud: false,
  listen: false,
  pauseBeforeEating: true,
  fitsYourDay: true,
  seasons: true,
});

/** When IndexedDB is unavailable, everything is kept for this visit only. */
const memory = { recipes: new Map<string, Recipe>(), groceries: new Map<string, GroceryItem>() };
let opened: Promise<IDBDatabase | undefined> | undefined;

function db(): Promise<IDBDatabase | undefined> {
  opened ??= openDatabase().catch(() => undefined);
  return opened;
}

function run<T>(store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        if (!database) return reject(new Error('No database'));
        const transaction = database.transaction(store, mode);
        const request = work(transaction.objectStore(store));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

const listeners = new Set<() => void>();
let version = 0;
const notify = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

// Settings changed in another open SOMA (or a restore elsewhere): read them again.
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => event.key?.startsWith('soma:') && notify());

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const storeVersion = () => version;

// ---------- Recipes ----------

export async function listRecipes(): Promise<Recipe[]> {
  if (!(await db())) return [...memory.recipes.values()];
  return run(RECIPES, 'readonly', (s) => s.getAll() as IDBRequest<Recipe[]>);
}

export async function putRecipe(recipe: Recipe): Promise<void> {
  if (!(await db())) memory.recipes.set(recipe.id, recipe);
  else await run(RECIPES, 'readwrite', (s) => s.put(recipe));
  notify();
  syncSoon();
}

/** Removes a recipe; the returned function puts it back. */
export async function deleteRecipe(id: string): Promise<() => Promise<void>> {
  const all = await listRecipes();
  const recipe = all.find((each) => each.id === id);
  if (!(await db())) memory.recipes.delete(id);
  else await run(RECIPES, 'readwrite', (s) => s.delete(id));
  notify();
  syncSoon();
  return async () => {
    if (recipe) await putRecipe(recipe);
  };
}

// ---------- Groceries ----------

export async function listGroceries(): Promise<GroceryItem[]> {
  if (!(await db())) return [...memory.groceries.values()];
  return run(GROCERIES, 'readonly', (s) => s.getAll() as IDBRequest<GroceryItem[]>);
}

/** Replaces the whole list (it is small); used for adds, ticks, moves and clears. */
export async function saveGroceries(items: readonly GroceryItem[]): Promise<void> {
  const database = await db();
  if (!database) {
    memory.groceries = new Map(items.map((item) => [item.id, item]));
  } else {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(GROCERIES, 'readwrite');
      const store = tx.objectStore(GROCERIES);
      store.clear();
      for (const item of items) store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  notify();
  syncSoon();
}

// ---------- Start ----------

/** The first SOMA kept its own database; anything there moves into the shared one, once. */
async function moveFromOldDatabase(): Promise<void> {
  const exists = await indexedDB.databases?.().then((all) => all.some((each) => each.name === 'soma')).catch(() => true);
  if (exists === false) return;
  const old = await openSoma();
  if (!old) return;
  const read = (store: string) =>
    new Promise<unknown[]>((resolve) => {
      if (!old.objectStoreNames.contains(store)) return resolve([]);
      const request = old.transaction(store, 'readonly').objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  const [recipes, groceries] = [await read('recipes'), await read('groceries')];
  old.close();
  for (const recipe of recipes) await run(RECIPES, 'readwrite', (s) => s.put(recipe));
  for (const item of groceries) await run(GROCERIES, 'readwrite', (s) => s.put(item));
  indexedDB.deleteDatabase('soma');
}

/** Opens storage, brings over anything from the first version, and listens for synced changes. */
export async function startStore(): Promise<void> {
  if (await db()) await moveFromOldDatabase().catch(() => undefined);
  onRemoteChanges(notify);
}

// ---------- Settings ----------

export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS) ?? '{}') as Partial<Settings>;
    const units = saved.units === 'metric' || saved.units === 'us' || saved.units === 'original' ? saved.units : defaultSettings().units;
    return { ...defaultSettings(), ...saved, units };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(next: Settings): void {
  try {
    try {
      localStorage.setItem(SETTINGS, JSON.stringify(next));
    } catch {
      // Storage full or blocked: this lasts for this visit only.
    }
  } catch {
    // Kept for this visit only.
  }
  notify();
}

// ---------- Everything, as one file ----------

export type Backup = { app: 'soma'; version: 1; savedAt: string; recipes: Recipe[]; groceries: GroceryItem[]; settings: Settings };

export async function backup(): Promise<Backup> {
  return { app: 'soma', version: 1, savedAt: new Date().toISOString(), recipes: await listRecipes(), groceries: await listGroceries(), settings: loadSettings() };
}

/** Brings recipes from a backup in beside the ones here; the same recipe keeps the newer copy. */
export async function restore(file: Backup): Promise<number> {
  if (file.app !== 'soma' || !Array.isArray(file.recipes)) throw new Error('That is not a SOMA backup.');
  const here = new Map((await listRecipes()).map((recipe) => [recipe.id, recipe]));
  let count = 0;
  for (const recipe of file.recipes) {
    const mine = here.get(recipe.id);
    if (!mine || mine.updatedAt < recipe.updatedAt) {
      await putRecipe(recipe);
      count += 1;
    }
  }
  return count;
}

export async function deleteEverything(): Promise<() => Promise<void>> {
  const before = await backup();
  for (const recipe of before.recipes) await deleteRecipe(recipe.id);
  await saveGroceries([]);
  return async () => {
    for (const recipe of before.recipes) await putRecipe(recipe);
    await saveGroceries(before.groceries);
  };
}
