import type { Recipe } from './recipes';

/**
 * What is in season, by month, for a temperate climate; months turn half a
 * year round south of the equator. After the USDA SNAP-Ed Seasonal Produce
 * Guide. A thought for the month, never a rule. Each has a short note on
 * keeping it, after the USDA FoodKeeper and common kitchen practice.
 */
export const SEASON_SOURCE = 'Based on the USDA SNAP-Ed Seasonal Produce Guide';
export const KEEPING_SOURCE = 'Based on the USDA FoodKeeper and common kitchen practice';

export type ProduceKind = 'vegetable' | 'fruit' | 'herb';

export type Produce = {
  id: string;
  /** As shown: "Brussels sprouts". */
  name: string;
  kind: ProduceKind;
  /** Months it is at its best in the north, 1-12. */
  months: number[];
  /** Words that find it in a recipe's ingredients ("squash" finds butternut squash), singular. */
  words: string[];
  /** A word that, just before, means something else ("sweet" potato). */
  notAfter?: string;
  /** Its name in TheMealDB's ingredient photos, when there is a fresh one (not a jar or a tin). */
  photo?: string;
  /** Its name for TheMealDB's ideas, when that is not the photo's name. */
  lookup?: string;
  /** How to keep it, in a line. */
  keep: string;
};

const range = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let m = from; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === to) break;
  }
  return out;
};

export const produce: Produce[] = [
  // Vegetables
  { id: 'asparagus', name: 'Asparagus', kind: 'vegetable', months: range(3, 6), words: ['asparagus'], photo: 'Asparagus', keep: 'Stand the stems in a little water in the fridge, like flowers; best within a few days.' },
  { id: 'beets', name: 'Beets', kind: 'vegetable', months: range(6, 11), words: ['beet', 'beetroot'], photo: 'Beetroot', keep: 'Twist off the leaves, then keep the roots in the fridge for a couple of weeks.' },
  { id: 'broccoli', name: 'Broccoli', kind: 'vegetable', months: [3, 4, 5, 6, 9, 10, 11], words: ['broccoli'], photo: 'Broccoli', keep: 'In the fridge, unwashed and loosely wrapped; best within a few days.' },
  { id: 'brussels', name: 'Brussels sprouts', kind: 'vegetable', months: range(9, 1), words: ['brussels sprout'], photo: 'Brussels Sprouts', keep: 'In the fridge, unwashed; best within a week or so.' },
  { id: 'cabbage', name: 'Cabbage', kind: 'vegetable', months: range(10, 3), words: ['cabbage'], photo: 'Cabbage', keep: 'Whole in the fridge, it keeps for weeks.' },
  { id: 'carrots', name: 'Carrots', kind: 'vegetable', months: range(6, 11), words: ['carrot'], photo: 'Carrots', keep: 'Take off any tops and keep them in the fridge; they last for weeks.' },
  { id: 'cauliflower', name: 'Cauliflower', kind: 'vegetable', months: range(9, 11), words: ['cauliflower'], keep: 'In the fridge, loosely wrapped; best within a week.' },
  { id: 'corn', name: 'Sweetcorn', kind: 'vegetable', months: range(7, 9), words: ['corn', 'sweetcorn'], lookup: 'Sweetcorn', keep: 'Sweetest soon after picking; keep it in its husk in the fridge and cook within a day or two.' },
  { id: 'cucumber', name: 'Cucumber', kind: 'vegetable', months: range(6, 9), words: ['cucumber'], photo: 'Cucumber', keep: 'In the fridge; best within a week.' },
  { id: 'eggplant', name: 'Eggplant', kind: 'vegetable', months: range(7, 10), words: ['eggplant', 'aubergine'], photo: 'Aubergine', keep: 'In a cool spot or the warmest part of the fridge; best within a few days.' },
  { id: 'green-beans', name: 'Green beans', kind: 'vegetable', months: range(6, 9), words: ['green bean'], photo: 'Green Beans', keep: 'In the fridge, unwashed; best within a week.' },
  { id: 'kale', name: 'Kale', kind: 'vegetable', months: range(10, 3), words: ['kale'], photo: 'Kale', keep: 'In the fridge, loosely wrapped; best within a week.' },
  { id: 'leeks', name: 'Leeks', kind: 'vegetable', months: range(10, 3), words: ['leek'], photo: 'Leek', keep: 'In the fridge, untrimmed, for a week or two; rinse between the layers before cooking.' },
  { id: 'lettuce', name: 'Lettuce', kind: 'vegetable', months: [4, 5, 6, 9, 10], words: ['lettuce'], photo: 'Lettuce', keep: 'In the fridge wrapped in a dry towel; best within a week.' },
  { id: 'parsnips', name: 'Parsnips', kind: 'vegetable', months: range(10, 3), words: ['parsnip'], photo: 'Parsnips', keep: 'In the fridge, like carrots, for a couple of weeks.' },
  { id: 'peas', name: 'Peas', kind: 'vegetable', months: range(4, 6), words: ['pea'], photo: 'Peas', keep: 'Shell just before cooking; fresh peas are best within a day or two.' },
  { id: 'peppers', name: 'Peppers', kind: 'vegetable', months: range(7, 10), words: ['bell pepper', 'red pepper', 'green pepper', 'yellow pepper', 'sweet pepper'], photo: 'Red Pepper', keep: 'In the fridge; best within a week or two.' },
  { id: 'potatoes', name: 'Potatoes', kind: 'vegetable', months: range(8, 11), words: ['potato'], notAfter: 'sweet', photo: 'Potatoes', keep: 'Somewhere cool, dark and airy, not the fridge, and away from onions.' },
  { id: 'pumpkin', name: 'Pumpkin', kind: 'vegetable', months: range(9, 11), words: ['pumpkin'], photo: 'Pumpkin', keep: 'Whole, somewhere cool and dark; it keeps for weeks, often months.' },
  { id: 'radishes', name: 'Radishes', kind: 'vegetable', months: range(4, 6), words: ['radish'], photo: 'Radish', keep: 'Take off the leaves and keep them in the fridge for a week or two.' },
  { id: 'spinach', name: 'Spinach', kind: 'vegetable', months: [3, 4, 5, 9, 10], words: ['spinach'], photo: 'Spinach', keep: 'In the fridge, dry; best within a few days.' },
  { id: 'squash', name: 'Winter squash', kind: 'vegetable', months: range(9, 2), words: ['squash', 'butternut'], photo: 'Butternut Squash', keep: 'Whole, somewhere cool and dark, not the fridge; it keeps for weeks.' },
  { id: 'sweet-potatoes', name: 'Sweet potatoes', kind: 'vegetable', months: range(9, 12), words: ['sweet potato'], photo: 'Sweet Potatoes', keep: 'Somewhere cool and dark, not the fridge.' },
  { id: 'tomatoes', name: 'Tomatoes', kind: 'vegetable', months: range(7, 9), words: ['tomato'], photo: 'Tomato', keep: 'At room temperature, out of the sun; the fridge dulls their flavour.' },
  { id: 'zucchini', name: 'Zucchini', kind: 'vegetable', months: range(6, 9), words: ['zucchini', 'courgette'], photo: 'Zucchini', keep: 'In the fridge; best within a week.' },
  { id: 'rhubarb', name: 'Rhubarb', kind: 'vegetable', months: range(4, 6), words: ['rhubarb'], photo: 'Rhubarb', keep: 'Stalks in the fridge for a week or two; the leaves are not eaten.' },
  // Fruit
  { id: 'apples', name: 'Apples', kind: 'fruit', months: range(8, 1), words: ['apple'], photo: 'Apples', keep: 'The fridge keeps them crisp for weeks; they ripen other fruit kept near them.' },
  { id: 'pears', name: 'Pears', kind: 'fruit', months: range(8, 12), words: ['pear'], photo: 'Pears', keep: 'Ripen at room temperature until the neck gives a little, then the fridge.' },
  { id: 'strawberries', name: 'Strawberries', kind: 'fruit', months: range(5, 7), words: ['strawberry'], photo: 'Strawberries', keep: 'In the fridge, unwashed; rinse just before eating; best in a day or two.' },
  { id: 'cherries', name: 'Cherries', kind: 'fruit', months: range(6, 7), words: ['cherry'], photo: 'Cherry', keep: 'In the fridge, unwashed; best within a few days.' },
  { id: 'blueberries', name: 'Blueberries', kind: 'fruit', months: range(6, 8), words: ['blueberry'], photo: 'Blueberries', keep: 'In the fridge, unwashed; they keep for a week or so.' },
  { id: 'raspberries', name: 'Raspberries', kind: 'fruit', months: range(6, 9), words: ['raspberry'], photo: 'Raspberries', keep: 'In the fridge in a single layer if you can; best within a day or two.' },
  { id: 'peaches', name: 'Peaches', kind: 'fruit', months: range(7, 9), words: ['peach'], photo: 'Peaches', keep: 'Ripen at room temperature until they give a little, then the fridge.' },
  { id: 'figs', name: 'Figs', kind: 'fruit', months: range(8, 9), words: ['fig'], photo: 'Figs', keep: 'In the fridge; best within a couple of days.' },
  { id: 'cranberries', name: 'Cranberries', kind: 'fruit', months: range(10, 12), words: ['cranberry'], photo: 'Cranberry', keep: 'In the fridge for weeks; they freeze well in their bag.' },
  { id: 'pomegranate', name: 'Pomegranate', kind: 'fruit', months: range(10, 12), words: ['pomegranate'], photo: 'Pomegranate', keep: 'Whole at room temperature for a week or two, longer in the fridge.' },
  { id: 'oranges', name: 'Oranges', kind: 'fruit', months: range(12, 3), words: ['orange'], photo: 'Orange', keep: 'A week or so at room temperature, longer in the fridge.' },
  { id: 'lemons', name: 'Lemons', kind: 'fruit', months: range(12, 4), words: ['lemon'], photo: 'Lemon', keep: 'A week or so at room temperature, a few weeks in the fridge.' },
  { id: 'grapefruit', name: 'Grapefruit', kind: 'fruit', months: range(1, 3), words: ['grapefruit'], photo: 'Grapefruit', keep: 'A week or so at room temperature, longer in the fridge.' },
  // Herbs
  { id: 'basil', name: 'Basil', kind: 'herb', months: range(6, 9), words: ['basil'], photo: 'Basil', keep: 'Stems in a glass of water on the counter, not the fridge.' },
  { id: 'parsley', name: 'Parsley', kind: 'herb', months: range(4, 10), words: ['parsley'], photo: 'Parsley', keep: 'Stems in a glass of water in the fridge, loosely covered.' },
  { id: 'cilantro', name: 'Cilantro', kind: 'herb', months: [4, 5, 6, 9, 10], words: ['cilantro', 'coriander leaves', 'fresh coriander'], photo: 'Cilantro', keep: 'Stems in a glass of water in the fridge, loosely covered.' },
  { id: 'mint', name: 'Mint', kind: 'herb', months: range(5, 9), words: ['mint'], photo: 'Mint', keep: 'Stems in a glass of water in the fridge, loosely covered.' },
  { id: 'dill', name: 'Dill', kind: 'herb', months: range(5, 8), words: ['dill'], photo: 'Dill', keep: 'Wrapped in a damp towel in the fridge; best within a few days.' },
  { id: 'chives', name: 'Chives', kind: 'herb', months: range(4, 9), words: ['chive'], lookup: 'Chives', keep: 'Wrapped in a damp towel in the fridge.' },
  { id: 'thyme', name: 'Thyme', kind: 'herb', months: range(5, 10), words: ['thyme'], photo: 'Fresh Thyme', lookup: 'Thyme', keep: 'Loosely wrapped in the fridge; it dries well too.' },
  { id: 'rosemary', name: 'Rosemary', kind: 'herb', months: range(5, 10), words: ['rosemary'], photo: 'Rosemary', keep: 'Loosely wrapped in the fridge; it dries well too.' },
];

export const kindNames: Record<ProduceKind, string> = { vegetable: 'Vegetables', fruit: 'Fruit', herb: 'Herbs' };

/** The month as it is where the person lives: south of the equator, half a year round. `month` 0-11. */
function localMonth(month: number, latitude?: number): number {
  return (latitude !== undefined && latitude < 0 ? (month + 6) % 12 : month) + 1;
}

/** Everything at its best this month. `month` 0-11. */
export function seasonal(month: number, latitude?: number): Produce[] {
  const m = localMonth(month, latitude);
  return produce.filter((item) => item.months.includes(m));
}

/** What comes in next month that is not here this month. */
export function comingNext(month: number, latitude?: number): Produce[] {
  const now = new Set(seasonal(month, latitude).map((item) => item.id));
  return seasonal((month + 1) % 12, latitude).filter((item) => !now.has(item.id));
}

/** Names in season this month (lower case), for the line on Home. `month` 0-11. */
export function inSeason(month: number, latitude?: number): string[] {
  return seasonal(month, latitude).map((item) => item.name.toLowerCase());
}

export function produceById(id: string): Produce | undefined {
  return produce.find((item) => item.id === id);
}

/** A pattern for one word with its plural: "berry" finds berries, "peach" peaches; never inside another word. */
function wordPattern(word: string, notAfter?: string): RegExp {
  const safe = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const stem = /[^aeiou]y$/.test(word) ? `${safe.slice(0, -1)}(?:y|ies)` : `${safe}(?:s|es)?`;
  return new RegExp(`${notAfter ? `(?<!${notAfter}\\s)` : ''}\\b${stem}\\b`, 'i');
}

const ingredientText = (recipe: Recipe) => recipe.ingredients.join('\n').toLowerCase();

function finds(text: string, item: Pick<Produce, 'words' | 'notAfter'>): boolean {
  return item.words.some((word) => wordPattern(word, item.notAfter).test(text));
}

/** Whether a recipe uses this (any of its words in an ingredient). */
export function usesProduce(recipe: Recipe, item: Produce): boolean {
  return finds(ingredientText(recipe), item);
}

/** The person's recipes that use something in season, with what they use. */
export function seasonalRecipes(recipes: readonly Recipe[], names: readonly string[]): { recipe: Recipe; uses: string[] }[] {
  const items = names.map((name) => produce.find((item) => item.name.toLowerCase() === name.toLowerCase()) ?? { name, words: [name] });
  return recipes
    .map((recipe) => {
      const text = ingredientText(recipe);
      return { recipe, uses: items.filter((item) => finds(text, item)).map((item) => item.name.toLowerCase()) };
    })
    .filter((hit) => hit.uses.length > 0)
    .sort((a, b) => b.uses.length - a.uses.length || a.recipe.title.localeCompare(b.recipe.title));
}

/** TheMealDB's photo of an ingredient (small, about 100 px), or undefined. */
export function producePhoto(item: Produce, size: 'small' | 'large' = 'small'): string | undefined {
  if (!item.photo) return undefined;
  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(item.photo)}${size === 'small' ? '-Small' : ''}.png`;
}
