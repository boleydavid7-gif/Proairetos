import { aisleFor, type Aisle, type AisleChoices } from './aisles';
import { isHeading } from './recipes';
import { convertAmountText, formatAmount, itemKey, readIngredient, type UnitSystem } from './ingredients';

/**
 * The grocery list: one line per thing, whichever recipes it came from.
 * Adding the same thing again joins it to the line already there. Ticked
 * items stay until the person clears them (with undo).
 */
export type GroceryItem = {
  id: string;
  name: string;
  /** Amounts as they came: ["2", "1 cup"]; same units add up. */
  amounts: string[];
  aisle: Aisle;
  checked: boolean;
  /** Recipes it came from, by id and title, for the By recipe view. */
  from: { id: string; title: string }[];
  addedAt: string;
  /** 'kitchen': bought and at home (the kitchen list), no longer to buy. */
  place?: 'kitchen';
  /** When it came home (YYYY-MM-DD). */
  boughtAt?: string;
};

/** Still to buy, as opposed to already in the kitchen. */
export const onList = (item: GroceryItem) => item.place !== 'kitchen';
export const inKitchen = (item: GroceryItem) => item.place === 'kitchen';

export type NewLine = { line: string; recipe?: { id: string; title: string } };

const amountOf = (line: string): { amount?: number; unit?: string; name: string } => {
  const read = readIngredient(line);
  return { amount: read.amount, unit: read.unit?.toLowerCase(), name: read.name };
};

const short = new Set(['tsp', 'tbsp', 'tbs', 'tb', 'g', 'kg', 'ml', 'l', 'oz', 'lb', 'lbs', 'c', 'fl oz']);
/** "cups" and "cup" are one unit; short ones (tsp, g) stay as they are. */
const singular = (unit: string) => (short.has(unit) ? unit : unit.replace(/(es|s)$/, (end) => (/(inch|dash|bunch)es$/.test(unit) ? '' : end === 'es' ? 'e' : '')));
const plural = (unit: string, count: number) => (short.has(unit) || count <= 1 ? unit : unit.endsWith('ch') || unit.endsWith('sh') ? `${unit}es` : `${unit}s`);

/** Adds two amounts when they share a unit (or both have none). */
function joinAmounts(amounts: string[], next: string): string[] {
  if (!next) return amounts;
  const parse = (text: string) => {
    const read = readIngredient(`${text} x`);
    return { amount: read.amount, unit: singular(read.unit?.toLowerCase() ?? '') };
  };
  const add = parse(next);
  if (add.amount !== undefined) {
    const at = amounts.findIndex((each) => {
      const have = parse(each);
      return have.amount !== undefined && have.unit === add.unit;
    });
    if (at >= 0) {
      const have = parse(amounts[at]);
      const total = formatAmount((have.amount ?? 0) + add.amount);
      const out = [...amounts];
      out[at] = add.unit ? `${total} ${plural(add.unit, (have.amount ?? 0) + add.amount)}` : total;
      return out;
    }
  }
  return [...amounts, next];
}

/** The amount part of a line, as text: "1 ½ cups" from "1 ½ cups rice". */
function amountText(line: string): string {
  const read = readIngredient(line);
  if (read.amount === undefined) return '';
  const unit = read.unit ? singular(read.unit.toLowerCase()) : '';
  // Things bought whole (3¾ cloves, 1½ onions) round up; measured things keep their amount.
  const whole = !unit || countable.has(unit);
  const show = (n: number) => (whole ? String(Math.ceil(n - 1e-9)) : formatAmount(n));
  const top = read.amountTo ?? read.amount;
  const count = show(read.amount) + (read.amountTo !== undefined && show(read.amountTo) !== show(read.amount) ? `–${show(read.amountTo)}` : '');
  return unit ? `${count} ${plural(unit, top)}` : count;
}

const countable = new Set(['clove', 'can', 'tin', 'slice', 'head', 'bunch', 'stalk', 'sprig', 'stick', 'package', 'packet']);

/** Plain water is not bought. */
const WATER = /^(?:(?:cold|warm|hot|boiling|lukewarm|tap|filtered|ice|iced|cool|room[- ]temperature)\s+)*water$/i;

/** List numbering ("2. Black beans", "10) Hot sauce") is not a quantity; take it off before reading the line. */
export function cleanLine(line: string): string {
  return line.trim().replace(/^\d{1,2}[.)]\s+(?=\p{L})/u, '').replace(/^[-*•·]\s+/, '').trim();
}

/** Words that open a part of a recipe rather than something to buy. */
const SECTION = /^(?:optional|extras?|upgrades?|toppings?|garnish(?:es)?|notes?|tips?|directions?|instructions?|steps?|method|serves|servings|yield|makes|to serve|for serving)(?!\p{L})/iu;
/** Words that start a cooking step. */
const STEP = /^(?:sauté|saute|mix|stir|add|heat|cook|bake|chop|slice|dice|combine|whisk|season|serve|top|toss|simmer|boil|fry|roast|grill|preheat|drain|rinse|spread|layer|fold|pour|blend|mash|marinate)(?!\p{L})/iu;

/**
 * Whether a recipe line is something to buy. Not a section heading ("For the sauce:", "Optional upgrades"), a
 * note in brackets, a separator line, an emoji title, a cooking step, plain water, or empty. Everything else
 * in a recipe (steps, notes, headings) stays out of the grocery list.
 */
export function isGrocery(line: string): boolean {
  const text = cleanLine(line);
  if (!text || isHeading(text)) return false;
  // A note in brackets, or a rule drawn between parts.
  if (/^[([].*[)\]]$/.test(text)) return false;
  if (/^[\s\-–—_=*~•·.]+$/.test(text)) return false;
  // A lone label such as "For the sauce:" or "Topping" with a colon.
  if (/^(for\s+(the\s+)?[^,]{1,40}|[A-Za-z ]{1,30}):$/.test(text)) return false;
  // A title that opens with a picture and carries no amount ("🥑 Guacamole Upgrade").
  if (/^\p{Extended_Pictographic}/u.test(text) && !/\d|[¼½¾⅓⅔]/.test(text)) return false;
  if (SECTION.test(text) && !/\d|[¼½¾⅓⅔]/.test(text)) return false;
  if (/\bupgrades?\b/i.test(text) && !/\d|[¼½¾⅓⅔]/.test(text)) return false;
  // A line in quotation marks that reads like a title.
  if (/["“”].+["“”]/.test(text) && text.split(/\s+/).length > 3) return false;
  // A step: starts with a cooking verb and runs on.
  if (STEP.test(text) && text.split(/\s+/).length > 4) return false;
  const name = readIngredient(text).name.trim();
  if (!name || WATER.test(name)) return false;
  return true;
}

export function addToList(
  list: readonly GroceryItem[],
  lines: readonly NewLine[],
  choices: AisleChoices,
  now: string,
  newId: () => string,
): GroceryItem[] {
  const out = list.map((item) => ({ ...item }));
  for (const { line: raw, recipe } of lines) {
    if (!isGrocery(raw)) continue;
    const line = cleanLine(raw);
    const { name } = amountOf(line);
    if (!name.trim()) continue;
    const key = itemKey(name);
    const existing = out.find((item) => itemKey(item.name) === key && !item.checked && onList(item));
    const amount = amountText(line);
    if (existing) {
      existing.amounts = joinAmounts(existing.amounts, amount);
      if (recipe && !existing.from.some((each) => each.id === recipe.id)) existing.from.push(recipe);
    } else {
      out.push({
        id: newId(),
        name: name.trim(),
        amounts: amount ? [amount] : [],
        aisle: aisleFor(name, choices),
        checked: false,
        from: recipe ? [recipe] : [],
        addedAt: now,
      });
    }
  }
  return out;
}

/** Items by aisle, in shop order; ticked ones last within each aisle. */
export function byAisle(all: readonly GroceryItem[]): { aisle: Aisle; items: GroceryItem[] }[] {
  const list = all.filter(onList);
  const order: Aisle[] = ['Produce', 'Meat & fish', 'Dairy & eggs', 'Bakery', 'Pantry', 'Spices', 'Frozen', 'Drinks', 'Other'];
  return order
    .map((aisle) => ({
      aisle,
      items: list
        .filter((item) => item.aisle === aisle)
        .sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Items by the recipe they came from; items added by hand under "Added". */
export function byRecipe(list: readonly GroceryItem[]): { title: string; items: GroceryItem[] }[] {
  const groups = new Map<string, { title: string; items: GroceryItem[] }>();
  for (const item of list.filter(onList)) {
    const sources = item.from.length ? item.from : [{ id: '', title: 'Added' }];
    for (const source of sources) {
      const group = groups.get(source.id) ?? { title: source.title, items: [] };
      group.items.push(item);
      groups.set(source.id, group);
    }
  }
  return [...groups.values()];
}

/** The list as plain text, to share or paste anywhere. */
export function listAsText(list: readonly GroceryItem[], unitSystem: UnitSystem = 'original'): string {
  return byAisle(list.filter((item) => !item.checked && onList(item)))
    .map(({ aisle, items }) => [aisle, ...items.map((item) => `- ${item.name}${item.amounts.length ? ` (${item.amounts.map((amount) => convertAmountText(amount, item.name, unitSystem).trim()).join(' + ')})` : ''}`)].join('\n'))
    .join('\n\n');
}

/** Whether a line is something the person usually has (salt, oil), so it starts unticked when adding a recipe. */
export function usuallyHave(line: string, have: readonly string[]): boolean {
  const key = itemKey(readIngredient(line).name);
  return have.some((each) => key.includes(itemKey(each)) && itemKey(each).length > 1);
}
