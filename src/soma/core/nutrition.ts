/*
 * What is in a recipe and its Nutri-Score, from the ingredients as written. Nutrients per 100 g come from USDA SR28
 * (public domain, nutritionTable.ts) for the raw ingredients; amounts become grams by unit, by SR28's household
 * weights for cups and spoons, or by a usual weight for one ("2 onions"). Nutri-Score is computed with the updated
 * algorithm for general foods (Santé publique France, 2023), on the whole recipe's weight. Lines too small to matter
 * (salt to taste, a pinch of spice) are left out; lines that cannot be read are listed, and when they could weigh
 * more than a tenth of the dish no grade is given, since what was not read is often the richest part.
 */
import { FOODS, type Food } from './nutritionTable';
import { readIngredient, type Ingredient } from './ingredients';

export const NUTRITION_SOURCE =
  'Nutrients: USDA National Nutrient Database for Standard Reference, Release 28. Nutri-Score: Santé publique France, updated algorithm for general foods (2023).';

export type Nutrients = { kcal: number; protein: number; fat: number; saturated: number; carbs: number; sugars: number; fibre: number; sodium: number };
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';
/** Each part of the score: points against (energy, sugars, saturated fat, salt) and for (protein, fibre, fruit and vegetables). */
export type ScoreParts = { energy: number; sugars: number; saturated: number; salt: number; protein: number; fibre: number; fvl: number; proteinCounted: boolean };
export type Nutrition = {
  /** Totals for the whole recipe. */
  total: Nutrients;
  grams: number;
  /** Share of the weight that is fruit, vegetables and legumes. */
  fvlPercent: number;
  read: { line: string; food: string; grams: number }[];
  /** Lines with an amount that could not be read, as written. */
  unread: string[];
  /** A rough weight for the lines not read, to know whether a grade would be fair. */
  unreadGrams: number;
  grade?: Grade;
  points?: number;
  parts?: ScoreParts;
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

/**
 * Nutri-Score for general foods, updated algorithm (Santé publique France, 2023), from nutrients per 100 g and the
 * fruit, vegetable and legume share. Red meat dishes (red meat at least half the weight) count at most 2 protein points.
 */
export function nutriScore(per100: Nutrients, fvlPercent: number, redMeat = false): { grade: Grade; points: number; parts: ScoreParts } {
  const kj = per100.kcal * 4.184;
  const salt = (per100.sodium * 2.5) / 1000;
  const against = {
    energy: points(kj, [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]),
    sugars: points(per100.sugars, [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51]),
    saturated: points(per100.saturated, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    salt: points(salt, [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4]),
  };
  const negative = against.energy + against.sugars + against.saturated + against.salt;
  const fvl = fvlPercent > 80 ? 5 : fvlPercent > 60 ? 2 : fvlPercent > 40 ? 1 : 0;
  const fibre = points(per100.fibre, [3.0, 4.1, 5.2, 6.3, 7.4]);
  const protein = Math.min(redMeat ? 2 : 7, points(per100.protein, [2.4, 4.8, 7.2, 9.6, 12, 14, 17]));
  // With 11 or more points against, protein no longer counts for the dish.
  const proteinCounted = negative < 11;
  const score = negative - fibre - fvl - (proteinCounted ? protein : 0);
  const grade: Grade = score <= 0 ? 'A' : score <= 2 ? 'B' : score <= 10 ? 'C' : score <= 18 ? 'D' : 'E';
  return { grade, points: score, parts: { ...against, protein, fibre, fvl, proteinCounted } };
}

/** A rough weight for a line Soma could not read: enough to tell a teaspoon from a pound. */
function roughGrams(ingredient: Ingredient): number {
  const amount = ingredient.amount ?? 0;
  const unit = ingredient.unit?.toLowerCase();
  if (!amount) return 0;
  if (unit && MASS[unit]) return amount * MASS[unit];
  if (unit && VOLUME[unit]) return amount * VOLUME[unit] * 180;
  if (unit && PINCH.test(unit)) return 0;
  if (unit && CAN.test(unit)) return amount * 400;
  if (unit === 'stick' || unit === 'sticks') return amount * 113;
  if (unit && ONE.test(unit)) return amount * 20;
  return amount * 100;
}

const RED_MEAT = new Set(['ground beef', 'beef', 'pork', 'ground pork', 'lamb', 'bacon', 'sausage', 'italian sausage', 'ham', 'pepperoni', 'salami', 'chorizo', 'hot dogs']);

/** The recipe's nutrients and Nutri-Score from its ingredient lines. */
export function recipeNutrition(lines: readonly string[]): Nutrition {
  let total = ZERO;
  let grams = 0;
  let fvlGrams = 0;
  let redMeatGrams = 0;
  let unreadGrams = 0;
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
      if (RED_MEAT.has(food.key)) redMeatGrams += weight;
      read.push({ line: text, food: food.key, grams: Math.round(weight) });
      continue;
    }
    if (NEGLIGIBLE.test(name) || SMALL.test(`${name} ${ingredient.note ?? ''}`) || (food && ingredient.amount === undefined)) continue;
    unread.push(text);
    unreadGrams += roughGrams(ingredient);
  }
  const fvlPercent = grams ? (fvlGrams / grams) * 100 : 0;
  const result: Nutrition = { total, grams, fvlPercent, read, unread, unreadGrams: Math.round(unreadGrams) };
  // Rated only when at least two lines were read and what was not read could weigh no more than a tenth of the dish.
  if (read.length >= 2 && grams > 0 && unreadGrams <= (grams + unreadGrams) * 0.1) {
    const per100 = Object.fromEntries(Object.entries(total).map(([key, value]) => [key, (value / grams) * 100])) as Nutrients;
    Object.assign(result, nutriScore(per100, fvlPercent, redMeatGrams >= grams / 2));
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
