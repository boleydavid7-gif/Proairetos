import { gunzipSync, strFromU8, unzipSync } from 'fflate';
import { clean, fromJsonLd, fromText, splitSteps } from './importRecipe';
import type { Recipe, RecipeDraft } from './recipes';

/*
 * Recipes from other recipe apps' export files, read on the device:
 *
 * - Paprika: `.paprikarecipes` (a zip of `.paprikarecipe` files, each gzipped JSON) or one `.paprikarecipe`.
 * - Mela: `.melarecipes` (a zip of `.melarecipe` JSON files) or one `.melarecipe`.
 * - Crouton: `.crumb` JSON files, alone or in a zip.
 * - Any app that exports schema.org recipes (RecipeSage, saved web pages): JSON or HTML with JSON-LD.
 * - Plain text or Markdown, one recipe a file.
 *
 * Each recipe is shown before it is kept; photos inside the file come back as bytes for the page to make small.
 */

export type Brought = {
  draft: RecipeDraft;
  /** A photo carried inside the file (Paprika, Mela, Crouton), still at its full size. */
  photo?: Uint8Array;
  /** The app it came from, as the person knows it. */
  from: string;
};

export type Reading = { recipes: Brought[]; unread: string[] };

type Json = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '');

/** "20 mins", "1 hr 10 min", "1:30", "PT45M", 45 -> minutes. */
export function looseMinutes(value: unknown): number | undefined {
  if (typeof value === 'number') return value > 0 ? Math.round(value) : undefined;
  const said = text(value).trim();
  if (!said) return undefined;
  const iso = said.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (iso && /^P/i.test(said)) {
    const minutes = Number(iso[1] ?? 0) * 1440 + Number(iso[2] ?? 0) * 60 + Number(iso[3] ?? 0);
    return minutes || undefined;
  }
  const clock = said.match(/^(\d{1,2}):(\d{2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]) || undefined;
  let minutes = 0;
  for (const part of said.matchAll(/(\d+(?:[.,]\d+)?)\s*(d(?:ays?)?|h(?:(?:ou)?rs?)?|m(?:in(?:ute)?s?)?)\b/gi)) {
    const amount = Number(part[1].replace(',', '.'));
    const unit = part[2].toLowerCase();
    minutes += unit.startsWith('d') ? amount * 1440 : unit.startsWith('h') ? amount * 60 : amount;
  }
  if (!minutes && /^\d+$/.test(said)) minutes = Number(said);
  return minutes > 0 ? Math.round(minutes) : undefined;
}

/** Lines of a list kept as one block of text; "# Sauce", "#Sauce" and "For the sauce:" become headings. */
export function listLines(value: unknown): string[] {
  const lines = Array.isArray(value) ? value.map(text) : text(value).replace(/\r/g, '').split('\n');
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^#+\s*\S/.test(line)) return `# ${line.replace(/^#+\s*/, '')}`;
      if (line.endsWith(':') && !/\d/.test(line) && line.length <= 40) return `# ${line.replace(/:$/, '').trim()}`;
      return line.replace(/^[-•*]\s+/, '');
    });
}

/** Steps kept as one block: one per paragraph or line, with headings kept. */
function stepLines(value: unknown): string[] {
  return listLines(value).flatMap((line) => (line.startsWith('# ') ? [line] : splitSteps(line)));
}

function base64(value: unknown): Uint8Array | undefined {
  const data = text(value).replace(/^data:[^,]*,/, '').replace(/\s/g, '');
  if (data.length < 100) return undefined;
  try {
    const raw = atob(data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    return bytes;
  } catch {
    return undefined;
  }
}

const webImage = (value: unknown) => {
  const address = text(value).trim();
  return /^https:\/\//i.test(address) ? address : undefined;
};

const joinNotes = (...parts: unknown[]) =>
  parts
    .map((part) => text(part).replace(/<[^>]*>/g, '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim())
    .filter(Boolean)
    .join('\n\n') || undefined;

const tagsOf = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const tags = value
    .map((each) => (typeof each === 'string' ? each : each && typeof each === 'object' ? text((each as Json).name) : ''))
    .map((each) => each.trim())
    .filter(Boolean);
  return tags.length ? [...new Set(tags)] : undefined;
};

const hostOf = (address: string | undefined) => {
  try {
    return address ? new URL(address).hostname.replace(/^www\./, '') : undefined;
  } catch {
    return undefined;
  }
};

const isPaprika = (data: Json) => 'directions' in data && ('ingredients' in data || 'name' in data);
const isMela = (data: Json) => 'instructions' in data && 'title' in data && typeof data.ingredients === 'string';
const isCrouton = (data: Json) => Array.isArray(data.steps) && Array.isArray(data.ingredients) && 'name' in data;

/** One Paprika recipe (its JSON, as in a `.paprikarecipe`). */
export function fromPaprika(data: Json): Brought {
  const url = text(data.source_url).startsWith('http') ? text(data.source_url) : undefined;
  const prepMinutes = looseMinutes(data.prep_time);
  const cookMinutes = looseMinutes(data.cook_time);
  return {
    from: 'Paprika',
    photo: base64(data.photo_data),
    draft: {
      title: clean(data.name) || 'A recipe',
      source: clean(data.source) || hostOf(url),
      url,
      image: webImage(data.image_url),
      servings: clean(data.servings) || undefined,
      prepMinutes,
      cookMinutes,
      totalMinutes: looseMinutes(data.total_time),
      ingredients: listLines(data.ingredients),
      steps: stepLines(data.directions),
      notes: joinNotes(data.description, data.notes),
      tags: tagsOf(data.categories),
      favorite: data.on_favorites === true || data.on_favorites === 1 ? true : undefined,
    },
  };
}

/** One Mela recipe (its JSON, as in a `.melarecipe`). */
export function fromMela(data: Json): Brought {
  const url = text(data.link).startsWith('http') ? text(data.link) : undefined;
  const images = Array.isArray(data.images) ? data.images : [];
  return {
    from: 'Mela',
    photo: base64(images[0]),
    draft: {
      title: clean(data.title) || 'A recipe',
      source: hostOf(url) ?? (clean(data.link) || undefined),
      url,
      servings: clean(data.yield) || undefined,
      prepMinutes: looseMinutes(data.prepTime),
      cookMinutes: looseMinutes(data.cookTime),
      totalMinutes: looseMinutes(data.totalTime),
      ingredients: listLines(data.ingredients),
      steps: stepLines(data.instructions),
      notes: joinNotes(data.text, data.notes),
      tags: tagsOf(data.categories),
      favorite: data.favorite === true ? true : undefined,
    },
  };
}

const CROUTON_UNITS: Record<string, string> = {
  CUP: 'cup',
  TABLESPOON: 'tbsp',
  TEASPOON: 'tsp',
  GRAMS: 'g',
  KGS: 'kg',
  OUNCE: 'oz',
  POUND: 'lb',
  MILLS: 'ml',
  LITRES: 'l',
  FLUID_OUNCE: 'fl oz',
  PINCH: 'pinch',
  CAN: 'can',
  BUNCH: 'bunch',
  PACKET: 'packet',
  SECTION: '',
  ITEM: '',
};

const FRACTIONS: [number, string][] = [
  [0.125, '⅛'],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
];

/** 1.5 -> "1½", 0.333 -> "⅓", 250 -> "250". */
export function amountText(amount: number): string {
  const whole = Math.floor(amount);
  const part = amount - whole;
  if (part < 0.01) return String(whole);
  const near = FRACTIONS.find(([value]) => Math.abs(value - part) < 0.02);
  if (near) return whole ? `${whole}${near[1]}` : near[1];
  return String(Math.round(amount * 100) / 100);
}

/** One Crouton recipe (its JSON, as in a `.crumb`). */
export function fromCrouton(data: Json): Brought {
  const ingredients = (data.ingredients as unknown[])
    .map((each) => {
      const line = (each ?? {}) as Json;
      const name = text((line.ingredient as Json | undefined)?.name ?? line.name).trim();
      const quantity = (line.quantity ?? {}) as Json;
      const amount = typeof quantity.amount === 'number' && quantity.amount > 0 ? amountText(quantity.amount) : '';
      const unit = CROUTON_UNITS[text(quantity.quantityType)] ?? text(quantity.quantityType).toLowerCase();
      if (text(quantity.quantityType) === 'SECTION') return name ? `# ${name}` : '';
      return [amount, unit, name].filter(Boolean).join(' ');
    })
    .filter(Boolean);
  const steps = [...(data.steps as unknown[])]
    .map((each) => (each ?? {}) as Json)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .flatMap((step) => {
      const words = clean(step.step);
      if (!words) return [];
      return step.isSection ? [`# ${words}`] : [words];
    });
  const url = text(data.webLink).startsWith('http') ? text(data.webLink) : undefined;
  const images = Array.isArray(data.images) ? data.images : [];
  const prepMinutes = looseMinutes(data.duration);
  const cookMinutes = looseMinutes(data.cookingDuration);
  return {
    from: 'Crouton',
    photo: base64(images[0]),
    draft: {
      title: clean(data.name) || 'A recipe',
      source: clean(data.sourceName) || hostOf(url),
      url,
      servings: typeof data.serves === 'number' && data.serves > 0 ? String(data.serves) : undefined,
      prepMinutes,
      cookMinutes,
      totalMinutes: prepMinutes || cookMinutes ? (prepMinutes ?? 0) + (cookMinutes ?? 0) : undefined,
      ingredients,
      steps,
      notes: joinNotes(data.notes),
      tags: tagsOf(data.tags),
    },
  };
}

/** A recipe in schema.org's shape, from a JSON file. */
function fromSchema(data: unknown): Brought | undefined {
  const draft = fromJsonLd([JSON.stringify(data)], undefined);
  if (!draft) return undefined;
  const node = data as Json;
  const url = text(node.url).startsWith('http') ? text(node.url) : undefined;
  return { from: 'a recipe file', draft: { ...draft, url: draft.url ?? url, source: draft.source ?? hostOf(url) } };
}

/** Whatever a JSON file holds: one recipe or a list of them, in any of the shapes above. */
export function fromJson(data: unknown): Brought[] {
  if (Array.isArray(data)) {
    // A list of schema.org recipes (RecipeSage) or of any app's recipes.
    return data.flatMap((each) => fromJson(each));
  }
  if (!data || typeof data !== 'object') return [];
  const node = data as Json;
  if (Array.isArray(node.recipes)) return fromJson(node.recipes);
  if (isCrouton(node)) return [fromCrouton(node)];
  if (isMela(node)) return [fromMela(node)];
  if (isPaprika(node)) return [fromPaprika(node)];
  const schema = fromSchema(data);
  return schema ? [schema] : [];
}

const blocksIn = (html: string) =>
  [...html.matchAll(/<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);

const extension = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
const isZip = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b;
const isGzip = (bytes: Uint8Array) => bytes[0] === 0x1f && bytes[1] === 0x8b;
/** Folders and the files macOS adds to zips. */
const skipped = (name: string) => name.endsWith('/') || /(^|\/)(__MACOSX|\.)/.test(name);

function readOne(name: string, bytes: Uint8Array, depth: number): Brought[] {
  if (isZip(bytes)) {
    if (depth > 1) return [];
    const files = unzipSync(bytes);
    return Object.entries(files)
      .filter(([inner]) => !skipped(inner))
      .flatMap(([inner, content]) => readOne(inner, content, depth + 1));
  }
  if (isGzip(bytes)) return readOne(name.replace(/\.gz$/i, ''), gunzipSync(bytes), depth);
  const kind = extension(name);
  const words = strFromU8(bytes).replace(/^﻿/, '');
  if (['paprikarecipe', 'melarecipe', 'crumb', 'json', 'melarecipes'].includes(kind) || /^\s*[[{]/.test(words)) {
    try {
      return fromJson(JSON.parse(words));
    } catch {
      return [];
    }
  }
  if (['html', 'htm'].includes(kind) || /<html|<script/i.test(words.slice(0, 2000))) {
    const draft = fromJsonLd(blocksIn(words));
    return draft ? [{ from: 'a web page', draft }] : [];
  }
  if (['txt', 'md', 'markdown', 'text'].includes(kind)) {
    const draft = fromText(words.replace(/^#+\s*/gm, ''));
    return draft.ingredients.length || draft.steps.length ? [{ from: 'a text file', draft }] : [];
  }
  return [];
}

/** Reads every file the person chose (or that a zip holds); a file that holds no recipe is named in `unread`. */
export function readRecipeFiles(files: readonly { name: string; bytes: Uint8Array }[]): Reading {
  const recipes: Brought[] = [];
  const unread: string[] = [];
  for (const file of files) {
    let found: Brought[] = [];
    try {
      found = readOne(file.name, file.bytes, 0);
    } catch {
      found = [];
    }
    found = found.filter(({ draft }) => draft.ingredients.length || draft.steps.length);
    if (found.length) recipes.push(...found);
    else unread.push(file.name);
  }
  return { recipes, unread };
}

const sameName = (title: string) => title.trim().toLowerCase().replace(/\s+/g, ' ');

/** A recipe already on the shelf: same name, and the same link when both have one. */
export function alreadyKept(draft: RecipeDraft, shelf: readonly Pick<Recipe, 'title' | 'url'>[]): boolean {
  return shelf.some((recipe) => sameName(recipe.title) === sameName(draft.title) && (!recipe.url || !draft.url || recipe.url === draft.url));
}

/** The file types the picker offers. */
export const RECIPE_FILES = '.paprikarecipes,.paprikarecipe,.melarecipes,.melarecipe,.crumb,.zip,.json,.html,.htm,.txt,.md';
