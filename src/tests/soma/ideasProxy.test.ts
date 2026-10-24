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

  it('normalizes a Tasty recipe detail for in-app review', async () => {
    const response = await handleRecipeIdeasRequest(
      new Request('https://proairetos.com/api/recipe-ideas?provider=tasty&id=8'),
      { TASTY_API_KEY: 'tasty-key' },
      async (input, init) => {
        expect(String(input)).toContain('/recipes/get-more-info?id=8');
        expect(new Headers(init?.headers).get('x-rapidapi-key')).toBe('tasty-key');
        return new Response(JSON.stringify({ name: 'Tomato toast', num_servings: 2, sections: [{ components: [{ raw_text: '2 tomatoes' }] }], instructions: [{ display_text: 'Toast the bread.' }] }), { status: 200 });
      },
    );
    expect(await response.json()).toMatchObject({ recipe: { title: 'Tomato toast', source: 'Tasty', ingredients: ['2 tomatoes'], steps: ['Toast the bread.'] } });
  });
});
