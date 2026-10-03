import { itemKey } from './ingredients';
import type { Recipe } from './recipes';

/**
 * What is in season, by month, for a temperate climate; months turn half a
 * year round south of the equator. After the USDA SNAP-Ed Seasonal Produce
 * Guide. A thought for the month, never a rule.
 */
export const SEASON_SOURCE = 'After the USDA SNAP-Ed Seasonal Produce Guide';

const byMonth: string[][] = [
  ['cabbage', 'citrus', 'kale', 'leek', 'parsnip', 'sweet potato'],
  ['cabbage', 'citrus', 'kale', 'leek', 'parsnip', 'cauliflower'],
  ['asparagus', 'broccoli', 'cabbage', 'leek', 'spinach', 'pea'],
  ['asparagus', 'pea', 'radish', 'spinach', 'spring onion', 'rhubarb'],
  ['asparagus', 'strawberry', 'pea', 'lettuce', 'radish', 'spinach'],
  ['strawberry', 'cherry', 'zucchini', 'green bean', 'lettuce', 'pea'],
  ['tomato', 'zucchini', 'corn', 'berry', 'cucumber', 'peach'],
  ['tomato', 'corn', 'pepper', 'eggplant', 'peach', 'zucchini'],
  ['apple', 'tomato', 'pepper', 'corn', 'squash', 'pear'],
  ['apple', 'pumpkin', 'squash', 'pear', 'kale', 'sweet potato'],
  ['pumpkin', 'squash', 'brussels sprout', 'cranberry', 'sweet potato', 'kale'],
  ['brussels sprout', 'cabbage', 'citrus', 'kale', 'parsnip', 'squash'],
];

/** `month` 0-11; south of the equator when `latitude` is below 0. */
export function inSeason(month: number, latitude?: number): string[] {
  const at = latitude !== undefined && latitude < 0 ? (month + 6) % 12 : month;
  return byMonth[at];
}

/** The person's recipes that use something in season, with what they use. */
export function seasonalRecipes(recipes: readonly Recipe[], produce: readonly string[]): { recipe: Recipe; uses: string[] }[] {
  return recipes
    .map((recipe) => {
      const text = ` ${recipe.ingredients.map((line) => itemKey(line)).join(' ')} `;
      return { recipe, uses: produce.filter((item) => text.includes(itemKey(item))) };
    })
    .filter((hit) => hit.uses.length > 0)
    .sort((a, b) => b.uses.length - a.uses.length || a.recipe.title.localeCompare(b.recipe.title));
}
