import { fromMeal, type Meal } from '../core/importRecipe';
import { holdDraft } from './draft';

/** TheMealDB: a free, open collection of recipes (themealdb.com). Searches go to it directly; nothing about the person is sent. */
export const MEALDB = 'https://www.themealdb.com/api/json/v1/1/';

export type Found = { idMeal: string; strMeal: string; strMealThumb?: string; strCategory?: string; strArea?: string };

export async function ask<T>(path: string): Promise<T> {
  const response = await fetch(`${MEALDB}${path}`);
  if (!response.ok) throw new Error('TheMealDB did not answer just now.');
  return (await response.json()) as T;
}

/** Meals that use an ingredient, by TheMealDB's name for it ("Butternut Squash"). */
export async function mealsWith(ingredient: string): Promise<Found[]> {
  const { meals } = await ask<{ meals: Found[] | null }>(`filter.php?i=${encodeURIComponent(ingredient.replace(/\s+/g, '_'))}`);
  return meals ?? [];
}

/** Brings a meal in as a draft to look over before keeping (the Edit page). */
export async function draftFrom(meal: Found): Promise<void> {
  const { meals } = await ask<{ meals: Meal[] | null }>(`lookup.php?i=${meal.idMeal}`);
  if (!meals?.[0]) throw new Error('missing');
  holdDraft(fromMeal(meals[0]));
}
