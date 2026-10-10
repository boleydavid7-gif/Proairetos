import type { RecipeDraft } from './recipes';

/**
 * Turning what someone brings in into a recipe: the structured recipe most
 * sites carry inside their pages (schema.org Recipe, as JSON-LD), a recipe
 * from TheMealDB, or text pasted from anywhere. The person sees the result
 * before it is kept.
 */

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };

/** Plain text from page text: tags out, entities read, spaces tidied. */
export function clean(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+\d*);/gi, (whole, name) => entities[name.toLowerCase()] ?? whole)
    .replace(/\s+/g, ' ')
    .trim();
}

/** "PT1H30M" -> 90; "PT45M" -> 45. */
export function isoMinutes(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return undefined;
  const minutes = Number(match[1] ?? 0) * 1440 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return minutes > 0 ? minutes : undefined;
}

type Json = Record<string, unknown>;

const isRecipe = (node: unknown): node is Json => {
  if (!node || typeof node !== 'object') return false;
  const type = (node as Json)['@type'];
  return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
};

function findRecipe(node: unknown): Json | undefined {
  if (Array.isArray(node)) {
    for (const each of node) {
      const found = findRecipe(each);
      if (found) return found;
    }
    return undefined;
  }
  if (!node || typeof node !== 'object') return undefined;
  if (isRecipe(node)) return node;
  const graph = (node as Json)['@graph'];
  if (graph) return findRecipe(graph);
  const main = (node as Json).mainEntity;
  return main ? findRecipe(main) : undefined;
}

function imageOf(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return imageOf(value[0]);
  if (value && typeof value === 'object') return imageOf((value as Json).url ?? (value as Json)['@id']);
  return undefined;
}

function nameOf(value: unknown): string | undefined {
  if (typeof value === 'string') return clean(value);
  if (Array.isArray(value)) return nameOf(value[0]);
  if (value && typeof value === 'object') return nameOf((value as Json).name);
  return undefined;
}

/** Steps from any of the shapes sites use: text, a list of HowToStep, or sections of them. */
function stepsOf(value: unknown): string[] {
  if (typeof value === 'string') return splitSteps(clean(value.replace(/<\/(p|li)>|<br\s*\/?>/gi, '\n')));
  if (Array.isArray(value)) return value.flatMap(stepsOf);
  if (value && typeof value === 'object') {
    const node = value as Json;
    if (node.itemListElement) {
      const name = clean(node.name);
      const inner = stepsOf(node.itemListElement);
      return name ? [`# ${name}`, ...inner] : inner;
    }
    const text = clean(node.text ?? node.name);
    return text ? [text] : [];
  }
  return [];
}

function yieldOf(value: unknown): string | undefined {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return clean(value) || undefined;
  if (Array.isArray(value)) return yieldOf(value.find((each) => typeof each === 'string' && /\D/.test(each)) ?? value[0]);
  return undefined;
}

export function fromJsonLd(blocks: readonly string[], pageUrl?: string): RecipeDraft | undefined {
  for (const block of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(block.trim());
    } catch {
      continue;
    }
    const recipe = findRecipe(data);
    if (!recipe) continue;
    const ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
      .map(clean)
      .filter(Boolean);
    let host: string | undefined;
    try {
      host = pageUrl ? new URL(pageUrl).hostname.replace(/^www\./, '') : undefined;
    } catch {
      host = undefined;
    }
    return {
      title: clean(recipe.name) || 'A recipe',
      source: nameOf(recipe.publisher) ?? host ?? nameOf(recipe.author),
      url: pageUrl,
      image: imageOf(recipe.image),
      servings: yieldOf(recipe.recipeYield),
      prepMinutes: isoMinutes(recipe.prepTime),
      cookMinutes: isoMinutes(recipe.cookTime),
      totalMinutes: isoMinutes(recipe.totalTime),
      ingredients,
      steps: stepsOf(recipe.recipeInstructions),
    };
  }
  return undefined;
}

/** A meal from TheMealDB (themealdb.com), its free and open recipe database. */
export type Meal = Record<string, string | null> & { idMeal: string; strMeal: string };

export function fromMeal(meal: Meal): RecipeDraft {
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const what = (meal[`strIngredient${i}`] ?? '').trim();
    if (!what) continue;
    const measure = (meal[`strMeasure${i}`] ?? '').trim();
    ingredients.push(measure ? `${measure} ${what}` : what);
  }
  return {
    title: meal.strMeal,
    source: 'TheMealDB',
    url: meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`,
    image: meal.strMealThumb ?? undefined,
    ingredients,
    steps: splitSteps(meal.strInstructions ?? ''),
  };
}

/** Steps from a block of text: one per line or numbered part, without the numbers. */
export function splitSteps(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/\n+|(?=(?:^|\s)(?:step\s*)?\d{1,2}[.)]\s)/i)
    .map((line) => line.replace(/^\s*(?:step\s*)?\d{1,2}[.):]?\s+/i, '').trim())
    .filter((line) => line.length > 2 && !/^step\s*\d*$/i.test(line));
}

const ingredientsHeading = /^(ingredients?|you will need|what you need)\s*:?$/i;
const notesHeading = /^(notes?|tips?|cook'?s notes?|recipe notes?|storage|to store|make ahead)\s*:?$/i;
/** A part of a list: "For the marinade:", "Sauce:", "To serve". */
const partHeading = /^(?:for\s+(?:the\s+)?[^\d,.]{2,40}|[A-Z][A-Za-z' ]{1,30}):?$/;
const isPart = (line: string) => partHeading.test(line) && (line.endsWith(':') || /^for\s/i.test(line)) && !/\d/.test(line);

/** "Prep 20 min", "Cook: 1 hr 10 mins", "Total time 45 minutes" anywhere in the text, as minutes. */
export function labelledMinutes(text: string, label: 'prep' | 'cook' | 'total'): number | undefined {
  const match = text.match(new RegExp(String.raw`\b${label}(?:ing)?(?:\s+time)?\s*:?\s*((?:\d+(?:[.,]\d+)?\s*(?:h(?:ou)?rs?|h|min(?:ute)?s?|m)\b\s*(?:and\s+)?){1,2})`, 'i'));
  if (!match) return undefined;
  let minutes = 0;
  for (const part of match[1].matchAll(/(\d+(?:[.,]\d+)?)\s*(h(?:ou)?rs?|h|min(?:ute)?s?|m)\b/gi)) {
    const value = Number(part[1].replace(',', '.'));
    minutes += /^h/i.test(part[2]) ? value * 60 : value;
  }
  return minutes > 0 ? Math.round(minutes) : undefined;
}
const stepsHeading = /^(instructions?|method|directions?|steps|preparation|how to make( it)?)\s*:?$/i;
const looksLikeIngredient = (line: string) =>
  /^[-•*]?\s*(\d|[¼½¾⅓⅔⅛]|a\s|an\s|one\s|pinch|handful|salt|pepper)/i.test(line) && line.length < 90;

/** A pasted recipe: the first line is the title, then ingredients and steps, by their headings or by their look. */
export function fromText(text: string): RecipeDraft {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] && !ingredientsHeading.test(lines[0]) ? lines.shift()! : 'A recipe';
  const ingredients: string[] = [];
  const steps: string[] = [];
  const notes: string[] = [];
  let into: 'ingredients' | 'steps' | 'notes' | undefined;
  for (const line of lines) {
    // "Serves 4 | Prep 20 min | Cook 30 min": read below, not kept as a line.
    if (/^(serves|servings|yield|makes|prep|cook|total)( time)?\s*:?\s*\d/i.test(line)) continue;
    if (ingredientsHeading.test(line)) {
      into = 'ingredients';
      continue;
    }
    if (stepsHeading.test(line)) {
      into = 'steps';
      continue;
    }
    if (notesHeading.test(line)) {
      into = 'notes';
      continue;
    }
    if (into === 'notes') {
      notes.push(line);
      continue;
    }
    // "For the marinade:" opens a part of the list (or of the steps).
    if (isPart(line) && into !== undefined) {
      (into === 'ingredients' ? ingredients : steps).push(`# ${line.replace(/:$/, '').trim()}`);
      continue;
    }
    const target = into ?? (looksLikeIngredient(line) ? 'ingredients' : 'steps');
    if (target === 'ingredients') ingredients.push(line.replace(/^[-•*]\s*/, ''));
    else steps.push(...splitSteps(line));
  }
  const servings = text.match(/(?:serves|servings|yield)\s*:?\s*(\d+(?:\s*(?:-|to)\s*\d+)?)/i)?.[1];
  const prepMinutes = labelledMinutes(text, 'prep');
  const cookMinutes = labelledMinutes(text, 'cook');
  const totalMinutes = labelledMinutes(text, 'total') ?? (prepMinutes || cookMinutes ? (prepMinutes ?? 0) + (cookMinutes ?? 0) : undefined);
  return { title, ingredients, steps, servings, prepMinutes, cookMinutes, totalMinutes, notes: notes.join('\n') || undefined };
}
