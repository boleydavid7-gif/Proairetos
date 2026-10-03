/**
 * Reading an ingredient line ("1 1/2 cups rolled oats, toasted"): the amount,
 * the unit, and the thing itself, so servings can scale and groceries can
 * merge. Lines it cannot read are kept exactly as written.
 */
export type Ingredient = {
  /** The amount, when there is one; a range keeps both ends. */
  amount?: number;
  amountTo?: number;
  unit?: string;
  /** "rolled oats" */
  name: string;
  /** ", toasted" or "(about 2)" */
  note?: string;
  line: string;
};

const fractions: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875, '⅕': 0.2 };

const units = [
  'tablespoons', 'tablespoon', 'tbsp', 'tbs', 'tb',
  'teaspoons', 'teaspoon', 'tsp',
  'cups', 'cup', 'c',
  'fluid ounces', 'fl oz', 'ounces', 'ounce', 'oz',
  'pounds', 'pound', 'lbs', 'lb',
  'grams', 'gram', 'g', 'kilograms', 'kilogram', 'kg',
  'millilitres', 'milliliters', 'ml', 'litres', 'liters', 'l',
  'pints', 'pint', 'quarts', 'quart',
  'cloves', 'clove', 'cans', 'can', 'tins', 'tin', 'packages', 'package', 'packets', 'packet',
  'pinch', 'pinches', 'dash', 'dashes', 'handful', 'handfuls', 'bunch', 'bunches',
  'slices', 'slice', 'sprigs', 'sprig', 'stalks', 'stalk', 'heads', 'head', 'sticks', 'stick',
];

/** One number: "1", "1.5", "1/2", "1 1/2", "1½", "½". */
const NUMBER = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[¼½¾⅓⅔⅛⅜⅝⅞⅕]?|[¼½¾⅓⅔⅛⅜⅝⅞⅕])`;
const AMOUNT = new RegExp(String.raw`^(${NUMBER})(?:\s*(?:-|–|to)\s*(${NUMBER}))?\s*`, 'i');

export function readNumber(text: string): number | undefined {
  const t = text.trim().replace(',', '.');
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const glyph = t.match(/^(\d*(?:\.\d+)?)\s*([¼½¾⅓⅔⅛⅜⅝⅞⅕])$/);
  if (glyph) return (glyph[1] ? Number(glyph[1]) : 0) + fractions[glyph[2]];
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function readIngredient(line: string): Ingredient {
  let rest = line.trim().replace(/^[-•*]\s*/, '');
  const ingredient: Ingredient = { name: rest, line };
  const amount = rest.match(AMOUNT);
  if (amount) {
    ingredient.amount = readNumber(amount[1]);
    if (amount[2]) ingredient.amountTo = readNumber(amount[2]);
    rest = rest.slice(amount[0].length);
    const unit = units.find((each) => new RegExp(`^${each.replace(' ', '\\s')}\\.?(\\s|$)`, 'i').test(rest));
    if (unit) {
      ingredient.unit = unit;
      rest = rest.slice(unit.length).replace(/^\.?\s*/, '');
      rest = rest.replace(/^of\s+/i, '');
    }
  }
  const noteAt = rest.search(/\s*(,|\(|;| - )/);
  if (noteAt > 0) {
    ingredient.note = rest.slice(noteAt).trim();
    rest = rest.slice(0, noteAt);
  }
  ingredient.name = rest.trim() || line.trim();
  return ingredient;
}

const nice: [number, string][] = [
  [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'],
];

/** 1.5 -> "1½", 0.333 -> "⅓", 2.4 -> "2.4", 250 -> "250". */
export function formatAmount(value: number): string {
  if (value >= 20) return String(Math.round(value));
  const whole = Math.floor(value + 1e-9);
  const part = value - whole;
  if (part < 0.04) return String(whole);
  const close = nice.find(([n]) => Math.abs(part - n) < 0.04);
  if (close) return `${whole || ''}${close[1]}`;
  if (part > 0.96) return String(whole + 1);
  return String(Math.round(value * 10) / 10);
}

/** The line with its amount multiplied ("2 cups" at x1.5 -> "3 cups"); lines without an amount stay as they are. */
export function scaleLine(line: string, factor: number): string {
  if (factor === 1) return line;
  const trimmed = line.trim().replace(/^[-•*]\s*/, '');
  const match = trimmed.match(AMOUNT);
  if (!match) return line;
  const from = readNumber(match[1]);
  if (from === undefined) return line;
  const to = match[2] ? readNumber(match[2]) : undefined;
  const scaled = formatAmount(from * factor) + (to !== undefined ? `–${formatAmount(to * factor)}` : '');
  return `${scaled} ${trimmed.slice(match[0].length)}`.trim();
}

/** A name for merging the same thing from two recipes: lower case, singular, no "fresh" or "large". */
export function itemKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fresh|large|small|medium|organic|extra[- ]virgin|chopped|diced|sliced|minced|whole)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(oes|ies|s)$/, (end) => (end === 'ies' ? 'y' : end === 'oes' ? 'o' : ''))
    .trim();
}
