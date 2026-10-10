import { aisleFor } from './aisles';
import { readIngredient } from './ingredients';
import type { Recipe } from './recipes';

/**
 * Ways to try a recipe: small, optional changes drawn from public health
 * guidance, each with its source. Offered beside a recipe, never applied by
 * themselves; keeping one writes it into the recipe's notes as the
 * person's own variation. No calories, no scores, no "good" or "bad" food.
 */
export type TryIt = { id: string; title: string; detail: string; source: string };

export const sources: Record<string, string> = {
  plate: 'Healthy Eating Plate, Harvard T.H. Chan School of Public Health',
  who: 'Healthy diet, World Health Organization (fact sheet, 2020)',
  dga: 'Dietary Guidelines for Americans, 2020–2025',
};

type Rule = { id: string; when: (text: string, names: string[]) => boolean; title: string; detail: string; source: keyof typeof sources };

const has = (text: string, ...words: string[]) => words.some((word) => text.includes(word));

const rules: Rule[] = [
  {
    id: 'greens',
    when: (_, names) => names.filter((name) => aisleFor(name) === 'Produce' && !has(name.toLowerCase(), 'garlic', 'onion', 'lemon', 'lime', 'ginger', 'herb', 'parsley', 'cilantro', 'basil')).length === 0,
    title: 'Add a handful of greens',
    detail: 'Spinach, kale or a side salad. Vegetables and fruit fill half the plate in the Healthy Eating Plate.',
    source: 'plate',
  },
  {
    id: 'brown-rice',
    when: (text) => has(text, 'white rice', 'jasmine rice', 'basmati') || (/\brice\b/.test(text) && !has(text, 'brown rice', 'wild rice', 'rice vinegar', 'rice noodle')),
    title: 'Brown rice, or half and half',
    detail: 'Whole grains keep their fibre. Half brown, half white is an easy start.',
    source: 'plate',
  },
  {
    id: 'whole-pasta',
    when: (text) => has(text, 'pasta', 'spaghetti', 'penne', 'linguine', 'fettuccine', 'macaroni') && !has(text, 'whole wheat', 'wholewheat', 'whole-wheat', 'wholemeal'),
    title: 'Whole-wheat pasta, or half and half',
    detail: 'More fibre, the same dish. Mixing the two keeps the feel of the original.',
    source: 'plate',
  },
  {
    id: 'beans',
    when: (text) => has(text, 'beef', 'bacon', 'sausage', 'ham', 'pork', 'lamb', 'chorizo', 'salami', 'pepperoni'),
    title: 'Some beans or lentils in place of some of the meat',
    detail: 'A can of beans or a cup of lentils stretches the dish. Red and processed meat are the ones guidance suggests keeping to a little.',
    source: 'plate',
  },
  {
    id: 'cream',
    when: (text) => has(text, 'heavy cream', 'double cream', 'whipping cream', 'cream,') || /\bcream\b/.test(text) && !has(text, 'sour cream', 'ice cream', 'cream cheese', 'coconut cream'),
    title: 'Half the cream as milk or Greek yogurt',
    detail: 'Stir yogurt in off the heat so it stays smooth. Less saturated fat, still creamy.',
    source: 'who',
  },
  {
    id: 'oil',
    when: (text) => has(text, 'butter') && !has(text, 'peanut butter', 'almond butter', 'buttermilk', 'butternut'),
    title: 'Olive oil for some of the butter',
    detail: 'In savoury cooking most of the butter can be olive oil. Plant oils are the fats the guidance favours.',
    source: 'plate',
  },
  {
    id: 'sugar',
    when: (text) => has(text, 'sugar', 'syrup', 'honey'),
    title: 'A quarter less sugar',
    detail: 'Most recipes hold up with a quarter less. Taste and see.',
    source: 'who',
  },
  {
    id: 'salt',
    when: (text) => has(text, 'soy sauce', 'stock', 'broth', 'bouillon', 'stock cube'),
    title: 'Low-salt stock or soy sauce, then taste',
    detail: 'Season at the end, once you know how salty the dish already is.',
    source: 'who',
  },
  {
    id: 'flour',
    when: (text) => has(text, 'all-purpose flour', 'plain flour', 'white flour'),
    title: 'Half whole-wheat flour',
    detail: 'In most breads, muffins and pancakes half the flour can be whole wheat.',
    source: 'dga',
  },
];

export function waysToTry(recipe: Pick<Recipe, 'ingredients'>): TryIt[] {
  const names = recipe.ingredients.filter((line) => !line.startsWith('# ')).map((line) => readIngredient(line).name);
  const text = recipe.ingredients.join(', ').toLowerCase();
  if (!names.length) return [];
  return rules
    .filter((rule) => rule.when(text, names))
    .slice(0, 4)
    .map(({ id, title, detail, source }) => ({ id, title, detail, source: sources[source] }));
}
