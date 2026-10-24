import { ask as askMealDb, draftFrom, type Found } from './mealdb';
import { apiUrl } from '../../app/apiBase';
import { holdDraft } from './draft';
import { fromJsonLd } from '../core/importRecipe';

/** A result from one of the sources shown in Soma's Ideas shelf. */
export type Idea = Found & {
  sourceId: 'mealdb' | 'wikibooks';
  sourceLabel: string;
  url?: string;
  importable: boolean;
};

const mealIdea = (meal: Found): Idea => ({ ...meal, sourceId: 'mealdb', sourceLabel: 'TheMealDB', importable: true });

/** Search the community Cookbook on Wikibooks. These remain external references. */
export async function searchWikibooks(query: string): Promise<Idea[]> {
  const words = query.trim();
  if (words.length < 2) return [];
  const params = new URLSearchParams({
    action: 'query', list: 'search', srnamespace: '102', srlimit: '12',
    srsearch: words, format: 'json', origin: '*',
  });
  const response = await fetch(`https://en.wikibooks.org/w/api.php?${params.toString()}`);
  if (!response.ok) throw new Error('Wikibooks did not answer just now.');
  const body = (await response.json()) as { query?: { search?: { pageid: number; title: string }[] } };
  return (body.query?.search ?? [])
    .filter((page) => page.title && !/^category:/i.test(page.title))
    .map((page) => ({
      idMeal: `wikibooks-${page.pageid}`,
      strMeal: page.title.replace(/^Cookbook:/i, '').trim(),
      strMealThumb: undefined,
      sourceId: 'wikibooks' as const,
      sourceLabel: 'Wikibooks Cookbook',
      url: `https://en.wikibooks.org/wiki/${page.title.replaceAll(' ', '_')}`,
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
