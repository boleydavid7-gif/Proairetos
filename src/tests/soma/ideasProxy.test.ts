import { describe, expect, it } from 'vitest';
import { handleRecipeIdeasRequest } from '../../../worker/recipeIdeas';

describe('Wikibooks ideas bridge', () => {
  it('queries the Cookbook namespace and returns search pages', async () => {
    let url = '';
    const response = await handleRecipeIdeasRequest(
      new Request('https://proairetos.com/api/recipe-ideas?q=tomato%20soup'),
      async (input) => {
        url = String(input);
        return new Response(JSON.stringify({ query: { search: [{ pageid: 42, title: 'Cookbook:Tomato soup' }] } }), { status: 200 });
      },
    );
    expect(url).toContain('srnamespace=102');
    expect(await response.json()).toEqual({ query: { search: [{ pageid: 42, title: 'Cookbook:Tomato soup' }] } });
  });

  it('rejects an empty search', async () => {
    expect((await handleRecipeIdeasRequest(new Request('https://proairetos.com/api/recipe-ideas?q=x'))).status).toBe(400);
  });
});
