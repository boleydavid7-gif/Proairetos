import { describe, expect, it } from 'vitest';
import { handleRecipeIdeasRequest } from '../../../worker/recipeIdeas';

describe('Wikibooks ideas bridge', () => {
  it('queries the Cookbook namespace and returns search pages', async () => {
    const urls: string[] = [];
    const response = await handleRecipeIdeasRequest(
      new Request('https://proairetos.com/api/recipe-ideas?q=tomato%20soup'),
      {},
      async (input) => {
        urls.push(String(input));
        return new Response(JSON.stringify({ query: { search: [{ pageid: 42, title: 'Cookbook:Tomato soup' }] } }), { status: 200 });
      },
    );
    expect(urls.some((url) => url.includes('srnamespace=102'))).toBe(true);
    expect(urls).toHaveLength(1);
    expect(await response.json()).toMatchObject({
      sources: { wikibooks: { status: 'ok', count: 1 } },
      query: { search: [expect.objectContaining({ pageid: 'wikibooks-42', provider: 'wikibooks', title: 'Tomato soup' })] },
    });
  });

  it('rejects an empty search', async () => {
    expect((await handleRecipeIdeasRequest(new Request('https://proairetos.com/api/recipe-ideas?q=x'))).status).toBe(400);
  });

  it('answers with no results when Wikibooks does not answer', async () => {
    const response = await handleRecipeIdeasRequest(new Request('https://proairetos.com/api/recipe-ideas?q=soup'), {}, async () => new Response('', { status: 503 }));
    expect(await response.json()).toMatchObject({ query: { search: [] }, sources: { wikibooks: { status: 'error', count: 0 } } });
  });

  it('no longer opens a paid provider detail', async () => {
    const response = await handleRecipeIdeasRequest(new Request('https://proairetos.com/api/recipe-ideas?provider=tasty&id=8'), {}, async () => { throw new Error('should not call out'); });
    expect(response.status).toBe(400);
  });
});
