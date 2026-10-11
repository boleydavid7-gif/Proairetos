/*
 * What is in a recipe and its Nutri-Score, from the ingredients as written. Nutrients per 100 g come from USDA SR28
 * (public domain, nutritionTable.ts) for the raw ingredients; amounts become grams by unit, by SR28's household
 * weights for cups and spoons, or by a usual weight for one ("2 onions"). Nutri-Score is computed with the published
 * 2017 algorithm (Santé publique France) for general foods, on the whole recipe's raw weight. Lines too small to
 * matter (salt to taste, a pinch of spice) are left out; lines that cannot be read are listed, and with too few read
 * no grade is given.
 */
import { FOODS, type Food } from './nutritionTable';
import { readIngredient, type Ingredient } from './ingredients';

export const NUTRITION_SOURCE =
  'Nutrients: USDA National Nutrient Database for Standard Reference, Release 28 (raw ingredients). Nutri-Score: Santé publique France, 2017 algorithm for general foods.';

export type Nutrients = { kcal: number; protein: number; fat: number; saturated: number; carbs: number; sugars: number; fibre: number; sodium: number };
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';
export type Nutrition = {
  /** Totals for the whole recipe. */
  total: Nutrients;
  grams: number;
  /** Share of the weight that is fruit, vegetables, legumes, nuts and olive, rapeseed or walnut oil. */
  fvlPercent: number;
  read: { line: string; food: string; grams: number }[];
  /** Lines with an amount that could not be read, as written. */
  unread: string[];
  grade?: Grade;
  points?: number;
};

const ZERO: Nutrients = { kcal: 0, protein: 0, fat: 0, saturated: 0, carbs: 0, sugars: 0, fibre: 0, sodium: 0 };

/** Herbs, spices and raising agents: too little to change the totals, so neither read nor counted against. */
const NEGLIGIBLE = /\b(?:black pepper|white pepper|pepper(?:corns)?|ground pepper|cumin|paprika|oregano|basil|thyme|rosemary|parsley|cilantro|coriander|dill|mint|bay leaf|bay leaves|cinnamon|nutmeg|turmeric|chil(?:i|li|e) (?:flakes|powder)|red pepper flakes|cayenne|garlic powder|onion powder|vanilla|baking powder|baking soda|bicarbonate|yeast|zest|sage|cardamom|cloves? \(spice\)|ground cloves|allspice|saffron|curry powder|garam masala|five[- ]spice|chives|tarragon|herbs|spice|seasoning|smoked paprika|fennel seeds?|mustard seeds?|sesame oil for)\b/;
const SMALL = /^(?:to taste|for (?:serving|garnish))$|\bto taste\b|\bfor garnish\b|\boptional\b/;

const MASS: Record<string, number> = { g: 1, gram: 1, grams: 1, kg: 1000, kilogram: 1000, kilograms: 1000, oz: 28.35, ounce: 28.35, ounces: 28.35, lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6 };
/** In US cups. */
const VOLUME: Record<string, number> = {
  cup: 1, cups: 1, c: 1, tbsp: 1 / 16, tbs: 1 / 16, tb: 1 / 16, tablespoon: 1 / 16, tablespoons: 1 / 16, tsp: 1 / 48, teaspoon: 1 / 48, teaspoons: 1 / 48,
  ml: 1 / 236.6, millilitres: 1 / 236.6, milliliters: 1 / 236.6, l: 1000 / 236.6, litres: 1000 / 236.6, liters: 1000 / 236.6,
  'fl oz': 1 / 8, 'fluid ounces': 1 / 8, pint: 2, pints: 2, quart: 4, quarts: 4,
};
const PINCH = /^(?:pinch|pinches|dash|dashes)$/;
const CAN = /^(?:cans?|tins?)$/;
const ONE = /^(?:cloves?|slices?|stalks?|sticks?)$/;

/** The food a recipe line names, if Soma knows it. Juice of a lemon or lime is the juice. */
export function foodFor(ingredient: Ingredient): Food | undefined {
  const name = ingredient.name.toLowerCase();
  if (/\bjuice\b/.test(ingredient.note ?? '') && /\blemons?\b/.test(name)) return FOODS.find((food) => food.key === 'lemon juice');
  if (/\bjuice\b/.test(ingredient.note ?? '') && /\blimes?\b/.test(name)) return FOODS.find((food) => food.key === 'lime juice');
  return FOODS.find((food) => food.match.test(name));
}

/** Grams for a line, or undefined when its amount cannot be weighed. */
export function gramsOf(ingredient: Ingredient, food: Food): number | undefined {
  const amount = ingredient.amountTo !== undefined && ingredient.amount !== undefined ? (ingredient.amount + ingredient.amountTo) / 2 : ingredient.amount;
  if (amount === undefined) return undefined;
  const unit = ingredient.unit?.toLowerCase();
  if (unit && MASS[unit]) return amount * MASS[unit];
  if (unit && VOLUME[unit]) return food.cup ? amount * VOLUME[unit] * food.cup : undefined;
  if (unit && PINCH.test(unit)) return amount * 0.4;
  if (unit && CAN.test(unit)) {
    // "1 (14-ounce) can": the size in brackets when there is one; else a usual can, drained for beans.
    // Beans and chickpeas are drained: about 60% of the can's weight.
    const drained = /bean|chickpea|lentil/.test(food.key) ? 0.6 : 1;
    const size = ingredient.line.match(/\((\d+(?:\.\d+)?)\s*-?\s*(oz|ounce|g|gram|ml)/i);
    if (size) return amount * Number(size[1]) * (/^o/i.test(size[2]) ? 28.35 : 1) * drained;
    return amount * 400 * drained;
  }
  if (unit === 'stick' || unit === 'sticks') return food.key === 'butter' ? amount * 113 : food.each ? amount * food.each : undefined;
  if (unit && ONE.test(unit)) return food.each ? amount * food.each : undefined;
  if (!unit) return food.each ? amount * food.each : undefined;
  return undefined;
}

const add = (sum: Nutrients, per100: readonly number[], grams: number): Nutrients => {
  const f = grams / 100;
  return {
    kcal: sum.kcal + per100[0] * f,
    protein: sum.protein + per100[1] * f,
    fat: sum.fat + per100[2] * f,
    saturated: sum.saturated + per100[3] * f,
    carbs: sum.carbs + per100[4] * f,
    sugars: sum.sugars + per100[5] * f,
    fibre: sum.fibre + per100[6] * f,
    sodium: sum.sodium + per100[7] * f,
  };
};

const points = (value: number, steps: readonly number[]) => steps.filter((step) => value > step).length;

/** Nutri-Score 2017 for general foods, from nutrients per 100 g and the fruit, vegetable, legume and nut share. */
export function nutriScore(per100: Nutrients, fvlPercent: number): { grade: Grade; points: number } {
  const kj = per100.kcal * 4.184;
  const negative =
    points(kj, [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]) +
    points(per100.sugars, [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]) +
    points(per100.saturated, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) +
    points(per100.sodium, [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]);
  const fvl = fvlPercent > 80 ? 5 : fvlPercent > 60 ? 2 : fvlPercent > 40 ? 1 : 0;
  const fibre = points(per100.fibre, [0.9, 1.9, 2.8, 3.7, 4.7]);
  const protein = points(per100.protein, [1.6, 3.2, 4.8, 6.4, 8.0]);
  const score = negative >= 11 && fvl < 5 ? negative - fibre - fvl : negative - fibre - fvl - protein;
  const grade: Grade = score <= -1 ? 'A' : score <= 2 ? 'B' : score <= 10 ? 'C' : score <= 18 ? 'D' : 'E';
  return { grade, points: score };
}

/** The recipe's nutrients and Nutri-Score from its ingredient lines. */
export function recipeNutrition(lines: readonly string[]): Nutrition {
  let total = ZERO;
  let grams = 0;
  let fvlGrams = 0;
  const read: Nutrition['read'] = [];
  const unread: string[] = [];
  for (const line of lines) {
    const text = line.trim();
    if (!text || text.endsWith(':') || text.startsWith('#')) continue;
    const ingredient = readIngredient(text);
    const name = ingredient.name.toLowerCase();
    const food = foodFor(ingredient);
    const weight = food ? gramsOf(ingredient, food) : undefined;
    if (food && weight !== undefined && weight > 0) {
      total = add(total, food.per100, weight);
      grams += weight;
      if (food.fvl) fvlGrams += weight;
      read.push({ line: text, food: food.key, grams: Math.round(weight) });
      continue;
    }
    if (NEGLIGIBLE.test(name) || SMALL.test(`${name} ${ingredient.note ?? ''}`) || (food && ingredient.amount === undefined)) continue;
    unread.push(text);
  }
  const fvlPercent = grams ? (fvlGrams / grams) * 100 : 0;
  const result: Nutrition = { total, grams, fvlPercent, read, unread };
  // Rated only when most lines were read: at least two, and three in four of those with an amount.
  if (read.length >= 2 && read.length / (read.length + unread.length) >= 0.75 && grams > 0) {
    const per100 = Object.fromEntries(Object.entries(total).map(([key, value]) => [key, (value / grams) * 100])) as Nutrients;
    Object.assign(result, nutriScore(per100, fvlPercent));
  }
  return result;
}

/** Totals divided by servings, rounded for reading. Salt is sodium × 2.5. */
export function perServing(total: Nutrients, servings: number): { kcal: number; protein: number; fat: number; saturated: number; carbs: number; sugars: number; fibre: number; salt: number } {
  const n = Math.max(1, servings);
  const one = (value: number) => Math.round((value / n) * 10) / 10;
  return {
    kcal: Math.round(total.kcal / n),
    protein: one(total.protein),
    fat: one(total.fat),
    saturated: one(total.saturated),
    carbs: one(total.carbs),
    sugars: one(total.sugars),
    fibre: one(total.fibre),
    salt: Math.round((total.sodium * 2.5) / n / 100) / 10,
  };
}
