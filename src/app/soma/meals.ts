import { useEffect, useState } from 'react';
import type { Recipe } from '../../soma/core/recipes';
import { stores } from '../../data/storage/indexeddb/database';
import { deviceDatabase } from '../services';
import { onRemoteChanges } from '../sync/syncController';

/**
 * SOMA, the recipe app, keeps its recipes in this same database. Proairetos
 * only reads them: meals planned for a day show in Days ahead, and meals
 * cooked for someone show in Reflect.
 */
export type Meal = { id: string; title: string };
export type CookedFor = { id: string; recipeId: string; title: string; day: string; people: string[] };

export async function readRecipes(): Promise<Recipe[]> {
  const db = await deviceDatabase;
  if (!db || !db.objectStoreNames.contains(stores.somaRecipes)) return [];
  return new Promise((resolve) => {
    const request = db.transaction(stores.somaRecipes, 'readonly').objectStore(stores.somaRecipes).getAll();
    request.onsuccess = () => resolve(request.result as Recipe[]);
    request.onerror = () => resolve([]);
  });
}

export function useRecipesFromSoma(): Recipe[] {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void readRecipes().then((next) => live && setRecipes(next));
    load();
    const off = onRemoteChanges(load);
    const onShow = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      live = false;
      off();
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);
  return recipes;
}

export function mealsOn(recipes: readonly Recipe[], day: string): Meal[] {
  return recipes.filter((recipe) => recipe.planned?.includes(day)).map((recipe) => ({ id: recipe.id, title: recipe.title }));
}

/** Meals cooked for someone between two days (from inclusive, until exclusive), newest first. */
export function cookedForBetween(recipes: readonly Recipe[], from: string, until: string): CookedFor[] {
  return recipes
    .flatMap((recipe) =>
      Object.entries(recipe.cookedFor ?? {})
        .filter(([day, people]) => day >= from && day < until && people.length > 0)
        .map(([day, people]) => ({ id: `${recipe.id}@${day}`, recipeId: recipe.id, title: recipe.title, day, people })),
    )
    .sort((a, b) => b.day.localeCompare(a.day));
}

/** "Mom", "Mom and Sam", "Mom, Sam and Ali". */
export function namesList(names: readonly string[]): string {
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
