/**
 * A recipe, as the person keeps it. Ingredients and steps are plain lines
 * (a line starting with "# " is a heading inside the list, such as "For the
 * sauce"). Nothing is scored or rated by the app.
 */
export type Recipe = {
  id: string;
  title: string;
  /** Where it came from: a site's name, a book, a person. */
  source?: string;
  url?: string;
  /** A photo: a web address from the import, or a small picture kept on the phone (data URL). */
  image?: string;
  /** How many it serves, as written ("4", "6 to 8"). */
  servings?: string;
  /** Minutes, when known. */
  prepMinutes?: number;
  cookMinutes?: number;
  totalMinutes?: number;
  ingredients: string[];
  steps: string[];
  notes: string;
  /** The person's own words for it: "weeknight", "for guests". */
  tags: string[];
  favorite?: boolean;
  /** Days it was cooked (YYYY-MM-DD), newest last. */
  cooked?: string[];
  /** Who it was cooked for, by day: { "2026-10-03": ["Mom"] }. */
  cookedFor?: Record<string, string[]>;
  /** The person's own marks (Quick, Comfort…), never the app's verdict. */
  marks?: Mark[];
  /** Days it is planned for (YYYY-MM-DD): the loose week. */
  planned?: string[];
  /** A personal estimate for the whole recipe, in the Oikonomia currency. */
  estimatedCostCents?: number;
  /** Kept with the estimate so changing currency never reinterprets old amounts. */
  estimatedCostCurrency?: string;
  createdAt: string;
  updatedAt: string;
};

export type Mark = 'quick' | 'comfort' | 'others' | 'ahead' | 'light';
export const marks: { id: Mark; label: string }[] = [
  { id: 'quick', label: 'Quick' },
  { id: 'comfort', label: 'Comfort' },
  { id: 'others', label: 'For others' },
  { id: 'ahead', label: 'Make ahead' },
  { id: 'light', label: 'Light' },
];
export const markLabel = (mark: Mark) => marks.find((each) => each.id === mark)?.label ?? mark;

export type RecipeDraft = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'notes' | 'tags'> & { notes?: string; tags?: string[] };

export const isHeading = (line: string) => line.startsWith('# ');
export const headingText = (line: string) => line.slice(2).trim();

/** "1 h 15 min", "40 min". */
export function minutesLabel(minutes: number | undefined): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function timeOf(recipe: Pick<Recipe, 'prepMinutes' | 'cookMinutes' | 'totalMinutes'>): number | undefined {
  return recipe.totalMinutes || (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) || undefined;
}

/** The first whole number in "4 servings" or "6 to 8", for scaling. */
export function servingsNumber(servings: string | undefined): number | undefined {
  const match = servings?.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

/** Every word must match: title, ingredients, tags, source. */
export function searchRecipes(recipes: readonly Recipe[], query: string): Recipe[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...recipes];
  return recipes.filter((recipe) => {
    const text = [recipe.title, recipe.source ?? '', ...recipe.tags, ...recipe.ingredients].join(' ').toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** Recipes that use what is at hand, the ones using more of it first. */
export function withWhatIHave(recipes: readonly Recipe[], have: string): { recipe: Recipe; uses: string[] }[] {
  const items = have
    .toLowerCase()
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!items.length) return [];
  return recipes
    .map((recipe) => {
      const text = recipe.ingredients.join(' ').toLowerCase();
      return { recipe, uses: items.filter((item) => text.includes(item)) };
    })
    .filter((hit) => hit.uses.length > 0)
    .sort((a, b) => b.uses.length - a.uses.length || a.recipe.title.localeCompare(b.recipe.title));
}

/** Times a step mentions ("simmer 10-15 minutes", "bake for 1 hour"), as minutes; a range takes its upper end. */
export function timersIn(step: string): { minutes: number; label: string }[] {
  const out: { minutes: number; label: string }[] = [];
  const pattern = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*(minutes?|mins?|hours?|hrs?)\b/gi;
  for (let match = pattern.exec(step); match; match = pattern.exec(step)) {
    const value = Number((match[2] ?? match[1]).replace(',', '.'));
    const hours = /^h/i.test(match[3]);
    const minutes = hours ? value * 60 : value;
    if (minutes > 0 && minutes <= 24 * 60) out.push({ minutes, label: match[0] });
  }
  return out;
}
