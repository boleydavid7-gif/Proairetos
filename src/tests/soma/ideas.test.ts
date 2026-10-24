import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeIdeas, openIdea, searchWikibooks, type Idea } from '../../soma/app/ideaSources';
import { takeDraft } from '../../soma/app/draft';

const idea = (idMeal: string, sourceId: Idea['sourceId'] = 'mealdb'): Idea => ({
  idMeal, strMeal: idMeal, sourceId, sourceLabel: sourceId === 'mealdb' ? 'TheMealDB' : 'Wikibooks Cookbook', importable: sourceId === 'mealdb',
});

describe('Soma idea sources', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('merges provider results without dropping distinct sources', () => {
    expect(mergeIdeas([idea('1'), idea('1')], [idea('1', 'wikibooks'), idea('2', 'wikibooks')]).map((each) => `${each.sourceId}:${each.idMeal}`)).toEqual([
      'mealdb:1', 'wikibooks:1', 'wikibooks:2',
    ]);
  });

  it('turns Wikibooks search results into external, attributed ideas', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ query: { search: [{ pageid: 'wikibooks-42', title: 'Tomato soup', provider: 'wikibooks' }] } }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await expect(searchWikibooks('tomato soup')).resolves.toEqual([expect.objectContaining({
      idMeal: 'wikibooks-42', strMeal: 'Tomato soup', sourceLabel: 'Wikibooks Cookbook', importable: false,
      url: 'https://en.wikibooks.org/wiki/Tomato_soup',
    })]);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/recipe-ideas?q=tomato%20soup'));
  });

  it('opens an external idea in Soma review when its page has a structured recipe', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: 'https://en.wikibooks.org/wiki/Cookbook:Soup', blocks: [JSON.stringify({ '@type': 'Recipe', name: 'Soup', recipeIngredient: ['1 onion'], recipeInstructions: ['Cook it'] })] }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const result = await openIdea({ ...idea('wikibooks-9', 'wikibooks'), url: 'https://en.wikibooks.org/wiki/Cookbook:Soup', importable: false });
    expect(result).toBe('edit');
    expect(takeDraft()).toMatchObject({ title: 'Soup', ingredients: ['1 onion'] });
  });
});
