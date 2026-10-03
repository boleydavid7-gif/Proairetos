import type { AisleChoices } from '../core/aisles';
import type { GroceryItem } from '../core/groceries';
import type { Recipe } from '../core/recipes';

/*
 * SOMA keeps recipes and the grocery list in its own database on this phone
 * (IndexedDB "soma"), and a few settings in localStorage. Nothing leaves the
 * phone except a recipe page read through the app's own bridge, and the
 * searches sent to TheMealDB when the person looks for ideas.
 */
const DB = 'soma';
const RECIPES = 'recipes';
const GROCERIES = 'groceries';
const SETTINGS = 'soma:settings';

export type Settings = {
  started: boolean;
  /** The daily line on Home. */
  dailyLine: boolean;
  /** "Ways to try it" beside recipes. */
  waysToTry: boolean;
  /** Things the person usually has, left unticked when adding a recipe's ingredients. */
  usuallyHave: string[];
  /** Aisles the person chose for particular items. */
  aisleChoices: AisleChoices;
};

export const defaultSettings = (): Settings => ({
  started: false,
  dailyLine: true,
  waysToTry: true,
  usuallyHave: ['salt', 'black pepper', 'olive oil', 'water'],
  aisleChoices: {},
});

const memory = { recipes: new Map<string, Recipe>(), groceries: new Map<string, GroceryItem>() };
let opened: Promise<IDBDatabase | undefined> | undefined;

function db(): Promise<IDBDatabase | undefined> {
  opened ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(RECIPES, { keyPath: 'id' });
        request.result.createObjectStore(GROCERIES, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
  return opened;
}

function run<T>(store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        if (!database) return reject(new Error('No database'));
        const request = work(database.transaction(store, mode).objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

const listeners = new Set<() => void>();
let version = 0;
const notify = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

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
}

/** Removes a recipe; the returned function puts it back. */
export async function deleteRecipe(id: string): Promise<() => Promise<void>> {
  const all = await listRecipes();
  const recipe = all.find((each) => each.id === id);
  if (!(await db())) memory.recipes.delete(id);
  else await run(RECIPES, 'readwrite', (s) => s.delete(id));
  notify();
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
  if (!(await db())) {
    memory.groceries = new Map(items.map((item) => [item.id, item]));
  } else {
    const database = (await db())!;
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
}

// ---------- Settings ----------

export function loadSettings(): Settings {
  try {
    return { ...defaultSettings(), ...(JSON.parse(localStorage.getItem(SETTINGS) ?? '{}') as Partial<Settings>) };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(next: Settings): void {
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(next));
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
