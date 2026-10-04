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

/** How measured ingredients are shown while the recipe itself stays unchanged. */
export type UnitSystem = 'original' | 'metric' | 'us';

type UnitFamily = 'volume' | 'mass';
type ConvertibleUnit = {
  key: string;
  family: UnitFamily;
  /** The amount of the base unit: millilitres for volume, grams for mass. */
  factor: number;
  aliases: readonly string[];
};

// Kitchen-sized, rounded constants keep the displayed result useful (1 cup is
// 240 ml, rather than a long laboratory conversion). The source recipe is
// never rewritten, so a person can always return to its original wording.
const convertibleUnits: readonly ConvertibleUnit[] = [
  { key: 'tsp', family: 'volume', factor: 5, aliases: ['tsp', 'teaspoon', 'teaspoons'] },
  { key: 'tbsp', family: 'volume', factor: 15, aliases: ['tbsp', 'tbs', 'tb', 'tablespoon', 'tablespoons'] },
  { key: 'cup', family: 'volume', factor: 240, aliases: ['c', 'cup', 'cups'] },
  { key: 'fl oz', family: 'volume', factor: 30, aliases: ['fl oz', 'fluid ounce', 'fluid ounces'] },
  { key: 'pint', family: 'volume', factor: 475, aliases: ['pint', 'pints'] },
  { key: 'quart', family: 'volume', factor: 950, aliases: ['quart', 'quarts'] },
  { key: 'ml', family: 'volume', factor: 1, aliases: ['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'] },
  { key: 'l', family: 'volume', factor: 1000, aliases: ['l', 'litre', 'litres', 'liter', 'liters'] },
  { key: 'g', family: 'mass', factor: 1, aliases: ['g', 'gram', 'grams'] },
  { key: 'kg', family: 'mass', factor: 1000, aliases: ['kg', 'kilogram', 'kilograms'] },
  { key: 'oz', family: 'mass', factor: 28.35, aliases: ['oz', 'ounce', 'ounces'] },
  { key: 'lb', family: 'mass', factor: 453.6, aliases: ['lb', 'lbs', 'pound', 'pounds'] },
];

const normalizeUnit = (unit: string) => unit.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
const unitByAlias = new Map<string, ConvertibleUnit>(convertibleUnits.flatMap((unit) => unit.aliases.map((alias) => [normalizeUnit(alias), unit] as const)));

function convertibleUnit(unit: string | undefined): ConvertibleUnit | undefined {
  return unit ? unitByAlias.get(normalizeUnit(unit)) : undefined;
}

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function unitPattern(unit: string): string {
  return escapeRegExp(unit).replace(/\\ /g, '\\s+');
}

function pluralUnit(key: string, amount: number): string {
  if (key === 'cup') return Math.abs(amount - 1) < 1e-9 ? 'cup' : 'cups';
  if (key === 'pint') return Math.abs(amount - 1) < 1e-9 ? 'pint' : 'pints';
  if (key === 'quart') return Math.abs(amount - 1) < 1e-9 ? 'quart' : 'quarts';
  return key;
}

function formatConvertedAmount(value: number, unit: string): string {
  // Decimal pounds are easier to use than a fractional pound (500 g → 1.1 lb).
  if (unit === 'lb') return String(Math.round(value * 10) / 10);
  return formatAmount(value);
}

function targetUnit(family: UnitFamily, baseAmount: number, system: UnitSystem): ConvertibleUnit {
  if (system === 'metric') {
    return convertibleUnits.find((unit) => unit.key === (family === 'volume' ? (baseAmount >= 1000 ? 'l' : 'ml') : baseAmount >= 1000 ? 'kg' : 'g'))!;
  }
  if (family === 'volume') {
    const key = baseAmount <= 10 ? 'tsp' : baseAmount < 60 ? 'tbsp' : 'cup';
    return convertibleUnits.find((unit) => unit.key === key)!;
  }
  return convertibleUnits.find((unit) => unit.key === (baseAmount >= 453.6 ? 'lb' : 'oz'))!;
}

/** Converts one measured amount while keeping the selected target unit for a range. */
function convertAmount(
  amount: number,
  unit: string,
  system: UnitSystem,
  target?: ConvertibleUnit,
): { amount: number; unit: string } | undefined {
  if (system === 'original') return { amount, unit };
  const source = convertibleUnit(unit);
  if (!source) return undefined;
  const chosen = target ?? targetUnit(source.family, amount * source.factor, system);
  return { amount: (amount * source.factor) / chosen.factor, unit: pluralUnit(chosen.key, (amount * source.factor) / chosen.factor) };
}

/**
 * Converts a recipe line for display. Headings, counts, and unrecognised
 * measurements stay as written. The stored recipe line is never changed.
 */
export function convertLine(line: string, system: UnitSystem): string {
  if (system === 'original') return line;
  const leading = line.match(/^\s*/)?.[0] ?? '';
  const bullet = line.slice(leading.length).match(/^[-•*]\s*/)?.[0] ?? '';
  const body = line.slice(leading.length + bullet.length);
  const amountMatch = body.match(AMOUNT);
  if (!amountMatch) return line;
  const read = readIngredient(body);
  if (read.amount === undefined || !read.unit) return line;
  const source = convertibleUnit(read.unit);
  if (!source) return line;
  const chosen = targetUnit(source.family, read.amount * source.factor, system);
  const first = convertAmount(read.amount, read.unit, system, chosen);
  if (!first) return line;
  const second = read.amountTo === undefined ? undefined : convertAmount(read.amountTo, read.unit, system, chosen);
  const afterAmount = body.slice(amountMatch[0].length);
  const unitMatch = afterAmount.match(new RegExp(`^${unitPattern(read.unit)}\\.?(?=\\s|$)`, 'i'));
  if (!unitMatch) return line;
  const rest = afterAmount.slice(unitMatch[0].length).replace(/^\s+/, '');
  const amountText = `${formatConvertedAmount(first.amount, first.unit)}${second ? `–${formatConvertedAmount(second.amount, first.unit)}` : ''}`;
  const converted = `${amountText} ${first.unit}${rest ? ` ${rest}` : ''}`;
  return `${leading}${bullet}${converted}`;
}

/** Converts an amount stored separately from its grocery name. */
export function convertAmountText(amountText: string, name: string, system: UnitSystem): string {
  if (system === 'original' || !amountText) return amountText;
  const suffix = ` ${name}`;
  const line = convertLine(`${amountText}${suffix}`, system);
  return line.endsWith(suffix) ? line.slice(0, -suffix.length) : amountText;
}

const conversionAliases = [...new Set(convertibleUnits.flatMap((unit) => unit.aliases))].sort((a, b) => b.length - a.length);
const measuredText = new RegExp(
  String.raw`(${NUMBER})(?:\s*(?:-|–|to)\s*(${NUMBER}))?(\s*)(${conversionAliases.map(unitPattern).join('|')})(?=\.?\b)`,
  'gi',
);
const temperatureText = /([0-9]+(?:[.,][0-9]+)?)(?:\s*(?:°|º)?\s*([FC])|\s*degrees\s*([FC])?)/gi;

/** Converts a temperature only when its source scale is explicit. */
export function convertTemperature(value: number, scale: string, system: UnitSystem): { value: number; scale: 'C' | 'F' } {
  const source = scale.toUpperCase();
  if (system === 'metric' && source === 'F') return { value: Math.round((value - 32) * (5 / 9)), scale: 'C' };
  if (system === 'us' && source === 'C') return { value: Math.round(value * (9 / 5) + 32), scale: 'F' };
  return { value: Math.round(value), scale: source === 'C' ? 'C' : 'F' };
}

/** Converts measured amounts and explicit cooking temperatures embedded in a step. */
export function convertText(text: string, system: UnitSystem): string {
  if (system === 'original') return text;
  const measured = text.replace(measuredText, (whole, firstText: string, secondText: string | undefined, _space: string, unitText: string) => {
    const first = readNumber(firstText);
    if (first === undefined) return whole;
    const source = convertibleUnit(unitText);
    if (!source) return whole;
    const chosen = targetUnit(source.family, first * source.factor, system);
    const firstConverted = convertAmount(first, unitText, system, chosen);
    if (!firstConverted) return whole;
    const second = secondText ? readNumber(secondText) : undefined;
    const secondConverted = second === undefined ? undefined : convertAmount(second, unitText, system, chosen);
    return `${formatConvertedAmount(firstConverted.amount, firstConverted.unit)}${secondConverted ? `–${formatConvertedAmount(secondConverted.amount, firstConverted.unit)}` : ''} ${firstConverted.unit}`;
  });
  return measured.replace(temperatureText, (whole, valueText: string, symbolScale: string | undefined, wordScale: string | undefined) => {
    const value = Number(valueText.replace(',', '.'));
    const scale = symbolScale ?? wordScale;
    if (!Number.isFinite(value) || !scale) return whole;
    const converted = convertTemperature(value, scale, system);
    return `${converted.value}°${converted.scale}`;
  });
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
