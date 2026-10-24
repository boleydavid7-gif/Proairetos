import { ask as askMealDb, draftFrom, type Found } from './mealdb';
import { apiUrl } from '../../app/apiBase';
import { holdDraft } from './draft';
import { fromJsonLd } from '../core/importRecipe';

/** A result from one of the sources shown in Soma's Ideas shelf. */
export type Idea = Found & {
  sourceId: 'mealdb' | 'wikibooks' | 'spoonacular' | 'tasty';
  sourceLabel: string;
  url?: string;
  importable: boolean;
};

const mealIdea = (meal: Found): Idea => ({ ...meal, sourceId: 'mealdb', sourceLabel: 'TheMealDB', importable: true });

/** Search the community Cookbook on Wikibooks. These remain external references. */
export async function searchWikibooks(query: string): Promise<Idea[]> {
  const words = query.trim();
  if (words.length < 2) return [];
  const response = await fetch(apiUrl(`/api/recipe-ideas?q=${encodeURIComponent(words)}`));
  if (!response.ok) throw new Error('Wikibooks did not answer just now.');
  const body = (await response.json()) as { query?: { search?: { pageid: string; title: string; provider?: Idea['sourceId']; image?: string; url?: string }[] } };
  return (body.query?.search ?? [])
    .filter((page) => page.title)
    .map((page) => ({
      idMeal: page.pageid,
      strMeal: page.title,
      strMealThumb: page.image,
      sourceId: page.provider ?? 'wikibooks',
      sourceLabel: page.provider === 'spoonacular' ? 'Spoonacular' : page.provider === 'tasty' ? 'Tasty' : 'Wikibooks Cookbook',
      url: page.url ?? `https://en.wikibooks.org/wiki/${page.title.replaceAll(' ', '_')}`,
      importable: false,
    }));
}

export async function mealIdeas(path: string): Promise<Idea[]> {
  const { meals } = await askMealDb<{ meals: Found[] | null }>(path);
  return (meals ?? []).map(mealIdea);
}

export async function openIdea(idea: Idea): Promise<'edit' | 'external'> {
  if (!idea.importable) {
    if (!idea.url) return 'external';
    try {
      const response = await fetch(apiUrl(`/api/recipe?url=${encodeURIComponent(idea.url)}`));
      if (response.ok) {
        const body = (await response.json()) as { url?: string; blocks?: string[] };
        const draft = fromJsonLd(body.blocks ?? [], body.url ?? idea.url);
        if (draft && (draft.ingredients.length > 0 || draft.steps.length > 0)) {
          holdDraft(draft);
          return 'edit';
        }
      }
    } catch {
      // The source remains available when the recipe bridge is offline.
    }
    window.open(idea.url, '_blank', 'noopener,noreferrer');
    return 'external';
  }
  await draftFrom(idea);
  return 'edit';
}

/** Merge sources without showing the same provider record twice. */
export function mergeIdeas(...groups: readonly Idea[][]): Idea[] {
  const seen = new Set<string>();
  return groups.flat().filter((idea) => {
    const key = `${idea.sourceId}:${idea.idMeal}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
