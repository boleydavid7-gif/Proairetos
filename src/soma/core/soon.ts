import { addDays } from '../../core/scheduling/dates';
import { itemKey } from './ingredients';
import { inKitchen, type GroceryItem } from './groceries';
import { usesFromKitchen } from './kitchen';
import type { Recipe } from './recipes';

/*
 * Use soon: the person may give a kitchen thing a day to use it by. For common fresh foods a first guess is offered,
 * the short end of the USDA FoodKeeper's refrigerator times, to change or clear. Facts only: no warnings, no "gone off".
 */

export const KEEPS_SOURCE = 'USDA FSIS, FoodKeeper (refrigerator storage times, short end of each range)';

/** Days in the fridge, by words in the name; the first match wins, so the specific comes before the general. */
const KEEPS: [RegExp, number][] = [
  [/\b(ground|mince[d]?)\b/, 1],
  [/\b(chicken|turkey|poultry|fish|salmon|cod|tuna steak|shrimp|prawns?|scallops?|sausages?)\b/, 1],
  [/\b(steak|beef|pork|lamb|chops?|roast)\b/, 3],
  [/\b(leftovers?|cooked|soup|stew)\b/, 3],
  [/\b(berries|strawberr\w*|raspberr\w*|blueberr\w*|blackberr\w*)\b/, 3],
  [/\b(spinach|lettuce|salad|greens|rocket|arugula|herbs?|basil|cilantro|coriander|parsley|mushrooms?)\b/, 3],
  [/\b(milk|cream)\b/, 7],
  [/\b(soft cheese|ricotta|mozzarella|feta|cottage cheese|brie)\b/, 7],
  [/\b(yogh?urt)\b/, 7],
  [/\b(broccoli|cauliflower|courgette|zucchini|peppers?|green beans|asparagus|cucumber|tomato(es)?)\b/, 3],
  [/\b(bread|tortillas?|rolls?)\b/, 5],
  [/\b(ham|deli|bacon|hot dogs?)\b/, 7],
  [/\b(carrots?|celery|cabbage|apples?|lemons?|limes?|oranges?)\b/, 14],
  [/\b(hard cheese|cheddar|parmesan|gouda)\b/, 21],
  [/\b(eggs?)\b/, 21],
];

/** About how many days a thing keeps in the fridge, when it is one of the common fresh foods. */
export function keepsAbout(name: string): number | undefined {
  const key = itemKey(name);
  return KEEPS.find(([pattern]) => pattern.test(key))?.[1];
}

/** The first guess for a thing put away today: its day to use by, if it is one the table knows. */
export function guessUseBy(name: string, today: string): string | undefined {
  const days = keepsAbout(name);
  return days === undefined ? undefined : addDays(today, days);
}

/** Kitchen things with a day to use by within `days`, soonest first (including ones whose day has come). */
export function soonItems(items: readonly GroceryItem[], today: string, days = 2): GroceryItem[] {
  const until = addDays(today, days);
  return items
    .filter((item) => inKitchen(item) && item.useBy && item.useBy <= until)
    .sort((a, b) => (a.useBy ?? '').localeCompare(b.useBy ?? '') || a.name.localeCompare(b.name));
}

/** Recipes that use any of these things, the ones using the most first. */
export function recipesUsing(recipes: readonly Recipe[], items: readonly GroceryItem[], limit = 3): { recipe: Recipe; uses: string[] }[] {
  const names = items.map((item) => item.name);
  return recipes
    .map((recipe) => ({ recipe, uses: usesFromKitchen(recipe.ingredients, names) }))
    .filter((each) => each.uses.length > 0)
    .sort((a, b) => b.uses.length - a.uses.length || a.recipe.title.localeCompare(b.recipe.title))
    .slice(0, limit);
}

/** "Use by Thu", "Use by today", "Use-by was Tue": a fact about the day the person set. */
export function shownUseBy(day: string | undefined, today: string): string | undefined {
  if (!day) return undefined;
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const name = (() => {
    const [ty, tm, td] = today.split('-').map(Number);
    const days = Math.round((date.getTime() - new Date(ty, tm - 1, td).getTime()) / 86_400_000);
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days > 1 && days < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  })();
  return day < today ? `Use-by was ${name}` : `Use by ${name}`;
}
