import { convertLine, convertText, formatAmount, itemKey, readIngredient, readNumber, scaleLine, type UnitSystem } from './ingredients';
import { headingText, isHeading } from './recipes';

/**
 * Help while cooking, read from the recipe itself: what to take out first,
 * the oven heat, each ingredient's amount beside its first mention in a
 * step, and measured amounts in steps scaled with the servings.
 */

/** Oven heats a recipe names: "350°F", "180 °C", "400 degrees". */
export function ovenHeats(steps: readonly string[], unitSystem: UnitSystem = 'original'): string[] {
  const found = new Set<string>();
  const pattern = /(\d{2,3})\s*(?:°?\s*([FC])|degrees\s*([FC])?\b|º\s*([FC]))/gi;
  for (const step of steps) {
    const shown = convertText(step, unitSystem);
    for (let match = pattern.exec(shown); match; match = pattern.exec(shown)) {
      const scale = (match[2] ?? match[3] ?? match[4] ?? '').toUpperCase();
      found.add(`${match[1]}°${scale}`);
    }
  }
  return [...found];
}

/** The word to look for in a step: "onion" for "1 large yellow onion, diced". */
function lookFor(name: string): string[] {
  const key = itemKey(name);
  const words = key.split(' ').filter((word) => word.length > 2);
  const last = words.at(-1);
  return [...new Set([key, last].filter((word): word is string => Boolean(word && word.length > 2)))];
}

/** The amount part of a line, scaled: "1 cup" from "1 cup rice"; the note too when short ("1, diced"). */
function amountOf(line: string, factor: number, unitSystem: UnitSystem): string | undefined {
  const scaled = convertLine(scaleLine(line, factor), unitSystem);
  const read = readIngredient(scaled);
  if (read.amount === undefined) return undefined;
  const amount = scaled.slice(0, scaled.toLowerCase().indexOf(read.name.toLowerCase())).trim();
  return amount || undefined;
}

/**
 * The step with amounts beside the first mention of each ingredient across
 * the steps: "Add the onion (1)". `seen` carries mentions between steps.
 */
export function withAmounts(step: string, ingredients: readonly string[], factor: number, seen: Set<string>, unitSystem: UnitSystem = 'original'): string {
  let out = step;
  for (const line of ingredients) {
    if (isHeading(line)) continue;
    const read = readIngredient(line);
    const amount = amountOf(line, factor, unitSystem);
    if (!amount) continue;
    const key = itemKey(read.name);
    if (seen.has(key)) continue;
    for (const word of lookFor(read.name)) {
      const match = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(e?s)?\\b(?![^(]*\\))`, 'i').exec(out);
      if (match) {
        seen.add(key);
        // The step already gives an amount ("4 cups stock"): leave it as written.
        if (/\d[^.;,]{0,14}$/.test(out.slice(Math.max(0, match.index - 16), match.index))) break;
        const end = match.index + match[0].length;
        out = `${out.slice(0, end)} (${amount})${out.slice(end)}`;
        break;
      }
    }
  }
  return out;
}

/** Every step with amounts beside first mentions. */
export function stepsWithAmounts(steps: readonly string[], ingredients: readonly string[], factor: number, unitSystem: UnitSystem = 'original'): string[] {
  const seen = new Set<string>();
  return steps.map((step) => (isHeading(step) ? step : withAmounts(scaleStep(step, factor, unitSystem), ingredients, factor, seen, unitSystem)));
}

const MEASURES = 'fluid\\s+ounces?|fl\\s+oz|cups?|c|tablespoons?|tbsp|tbs|tb|teaspoons?|tsp|grams?|g|kilograms?|kg|millilit(?:re|er)s?|ml|lit(?:re|er)s?|l|ounces?|oz|pounds?|lbs?|pints?|quarts?';
const MEASURED = new RegExp(
  String.raw`(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[¼½¾⅓⅔⅛]?|[¼½¾⅓⅔⅛])(\s*(?:${MEASURES})\b)`,
  'gi',
);

/** Measured amounts in a step ("add 2 cups of stock") scaled; times, heats and counts stay. */
export function scaleStep(step: string, factor: number, unitSystem: UnitSystem = 'original'): string {
  const scaled = factor === 1
    ? step
    : step.replace(MEASURED, (whole, number: string, unit: string) => {
        const value = readNumber(number);
        return value === undefined ? whole : `${formatAmount(value * factor)}${/\s$/.test(number) ? ' ' : ''}${unit}`;
      });
  return convertText(scaled, unitSystem);
}

/** What to take out before starting: every ingredient, scaled, under its headings. */
export function gatherList(ingredients: readonly string[], factor: number, unitSystem: UnitSystem = 'original'): { heading?: string; line: string }[] {
  return ingredients.map((line) => (isHeading(line) ? { heading: headingText(line), line: '' } : { line: convertLine(scaleLine(line, factor), unitSystem) }));
}

/** A short name for a timer, from its step: "Simmer the rice" from "Simmer the rice for 18 minutes, covered." */
export function timerName(step: string, label: string): string {
  step = step.replace(/\s*\([^)]*\)/g, '');
  const sentence = step.split(/(?<=[.!?])\s+/).find((part) => part.includes(label)) ?? step;
  const before = sentence.slice(0, sentence.indexOf(label)).replace(/\b(for|about|until|another|around|approximately|then)\s*$/i, '').trim();
  const words = (before || sentence).replace(/[,;:]+$/, '').split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Timer';
}
