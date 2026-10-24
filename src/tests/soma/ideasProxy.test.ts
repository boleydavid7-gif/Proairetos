import { describe, expect, it } from 'vitest';
import { handleRecipeIdeasRequest } from '../../../worker/recipeIdeas';

describe('Wikibooks ideas bridge', () => {
  it('queries the Cookbook namespace and returns search pages', async () => {
    const urls: string[] = [];
    let tastyHeaders: Headers | undefined;
    const response = await handleRecipeIdeasRequest(
      new Request('https://proairetos.com/api/recipe-ideas?q=tomato%20soup'),
      { SPOONACULAR_API_KEY: 'spoon-key', TASTY_API_KEY: 'tasty-key' },
      async (input, init) => {
        const url = String(input);
        urls.push(url);
        if (url.includes('tasty.p.rapidapi')) tastyHeaders = new Headers(init?.headers);
        if (url.includes('spoonacular')) return new Response(JSON.stringify({ results: [{ id: 7, title: 'Tomato pasta', image: 'https://img.test/pasta.jpg', sourceUrl: 'https://source.test/pasta' }] }), { status: 200 });
        if (url.includes('tasty.p.rapidapi')) return new Response(JSON.stringify({ results: [{ id: 8, name: 'Tomato toast', thumbnail_url: 'https://img.test/toast.jpg', canonical_url: 'https://source.test/toast' }] }), { status: 200 });
        return new Response(JSON.stringify({ query: { search: [{ pageid: 42, title: 'Cookbook:Tomato soup' }] } }), { status: 200 });
      },
    );
    expect(urls.some((url) => url.includes('srnamespace=102'))).toBe(true);
    expect(tastyHeaders?.get('x-rapidapi-key')).toBe('tasty-key');
    expect((await response.json())).toMatchObject({ configured: { spoonacular: true, tasty: true }, sources: { spoonacular: { status: 'ok', count: 1 }, tasty: { status: 'ok', count: 1 }, wikibooks: { status: 'ok', count: 1 } }, query: { search: expect.arrayContaining([
      expect.objectContaining({ pageid: 'spoonacular-7', provider: 'spoonacular' }),
      expect.objectContaining({ pageid: 'tasty-8', provider: 'tasty' }),
      expect.objectContaining({ pageid: 'wikibooks-42', provider: 'wikibooks' }),
    ]) } });
  });

  it('rejects an empty search', async () => {
    expect((await handleRecipeIdeasRequest(new Request('https://proairetos.com/api/recipe-ideas?q=x'))).status).toBe(400);
  });

  it('accepts the alternate RapidAPI secret binding name', async () => {
    let tastyCalled = false;
    const response = await handleRecipeIdeasRequest(
      new Request('https://proairetos.com/api/recipe-ideas?q=soup'),
      { TASTY_RAPIDAPI_KEY: 'tasty-key' },
      async (input) => {
        if (String(input).includes('tasty.p.rapidapi')) tastyCalled = true;
        return new Response(JSON.stringify({ results: [] }), { status: 200 });
      },
    );
    expect(tastyCalled).toBe(true);
    expect(await response.json()).toMatchObject({ configured: { tasty: true }, sources: { tasty: { status: 'ok', count: 0 } } });
  });
});
