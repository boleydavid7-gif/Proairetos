/** Server-side recipe search fan-in. Provider keys stay in Worker secrets. */
export type RecipeIdeasEnv = { SPOONACULAR_API_KEY?: string; TASTY_API_KEY?: string; TASTY_RAPIDAPI_KEY?: string };

type SearchPage = { pageid: string; title: string; provider: 'wikibooks' | 'spoonacular' | 'tasty'; image?: string; url?: string };
type ProviderRecipe = { title: string; source: string; url?: string; image?: string; servings?: string; totalMinutes?: number; ingredients: string[]; steps: string[] };

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}

const text = (value: unknown) => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';

async function wikibooks(query: string, fetchImpl: typeof fetch): Promise<SearchPage[]> {
  const params = new URLSearchParams({ action: 'query', list: 'search', srnamespace: '102', srlimit: '12', srsearch: query, format: 'json' });
  const response = await fetchImpl(`https://en.wikibooks.org/w/api.php?${params.toString()}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('Wikibooks did not answer.');
  const body = (await response.json()) as { query?: { search?: { pageid: number; title: string }[] } };
  return (body.query?.search ?? []).filter((page) => page.title && !/^category:/i.test(page.title)).map((page) => ({
    pageid: `wikibooks-${page.pageid}`,
    title: page.title.replace(/^Cookbook:/i, '').trim(),
    provider: 'wikibooks' as const,
    url: `https://en.wikibooks.org/wiki/${page.title.replaceAll(' ', '_')}`,
  }));
}

async function spoonacular(query: string, key: string, fetchImpl: typeof fetch): Promise<SearchPage[]> {
  const params = new URLSearchParams({ query, number: '12', addRecipeInformation: 'true', apiKey: key });
  const response = await fetchImpl(`https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('Spoonacular did not answer.');
  const body = (await response.json()) as { results?: { id: number; title: string; image?: string; sourceUrl?: string }[] };
  return (body.results ?? []).filter((recipe) => recipe.title).map((recipe) => ({
    pageid: `spoonacular-${recipe.id}`, title: recipe.title, provider: 'spoonacular' as const, image: recipe.image, url: recipe.sourceUrl,
  }));
}

async function tasty(query: string, key: string, fetchImpl: typeof fetch): Promise<SearchPage[]> {
  const params = new URLSearchParams({ from: '0', size: '12', q: query });
  const response = await fetchImpl(`https://tasty.p.rapidapi.com/recipes/list?${params.toString()}`, {
    headers: { accept: 'application/json', 'x-rapidapi-key': key, 'x-rapidapi-host': 'tasty.p.rapidapi.com' }, signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Tasty did not answer.');
  const body = (await response.json()) as { results?: { id: number; name: string; thumbnail_url?: string; canonical_url?: string }[] };
  return (body.results ?? []).filter((recipe) => recipe.name).map((recipe) => ({
    pageid: `tasty-${recipe.id}`, title: recipe.name, provider: 'tasty' as const, image: recipe.thumbnail_url, url: recipe.canonical_url,
  }));
}

async function spoonacularRecipe(id: string, key: string, fetchImpl: typeof fetch): Promise<ProviderRecipe> {
  const params = new URLSearchParams({ includeNutrition: 'false', apiKey: key });
  const response = await fetchImpl(`https://api.spoonacular.com/recipes/${encodeURIComponent(id)}/information?${params.toString()}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('Spoonacular did not answer.');
  const body = (await response.json()) as {
    title?: string; sourceUrl?: string; image?: string; servings?: number; readyInMinutes?: number;
    extendedIngredients?: { original?: string; originalString?: string; name?: string }[];
    analyzedInstructions?: { steps?: { step?: string }[] }[]; instructions?: string;
  };
  const steps = (body.analyzedInstructions ?? []).flatMap((group) => (group.steps ?? []).map((step) => text(step.step)).filter(Boolean));
  if (!steps.length && body.instructions) steps.push(text(body.instructions));
  return {
    title: text(body.title) || 'A recipe', source: 'Spoonacular', url: body.sourceUrl, image: body.image,
    servings: body.servings ? String(body.servings) : undefined, totalMinutes: body.readyInMinutes,
    ingredients: (body.extendedIngredients ?? []).map((ingredient) => text(ingredient.original ?? ingredient.originalString ?? ingredient.name)).filter(Boolean), steps,
  };
}

async function tastyRecipe(id: string, key: string, fetchImpl: typeof fetch): Promise<ProviderRecipe> {
  const params = new URLSearchParams({ id });
  const response = await fetchImpl(`https://tasty.p.rapidapi.com/recipes/get-more-info?${params.toString()}`, {
    headers: { accept: 'application/json', 'x-rapidapi-key': key, 'x-rapidapi-host': 'tasty.p.rapidapi.com' }, signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Tasty did not answer.');
  const body = (await response.json()) as {
    name?: string; canonical_url?: string; thumbnail_url?: string; num_servings?: number; total_time_minutes?: number;
    sections?: { components?: { raw_text?: string }[] }[]; instructions?: { display_text?: string }[];
  };
  return {
    title: text(body.name) || 'A recipe', source: 'Tasty', url: body.canonical_url, image: body.thumbnail_url,
    servings: body.num_servings ? String(body.num_servings) : undefined, totalMinutes: body.total_time_minutes,
    ingredients: (body.sections ?? []).flatMap((section) => (section.components ?? []).map((component) => text(component.raw_text)).filter(Boolean)),
    steps: (body.instructions ?? []).map((step) => text(step.display_text)).filter(Boolean),
  };
}

async function providerRecipe(provider: string, id: string, env: RecipeIdeasEnv, fetchImpl: typeof fetch): Promise<ProviderRecipe> {
  if (provider === 'spoonacular' && env.SPOONACULAR_API_KEY) return spoonacularRecipe(id, env.SPOONACULAR_API_KEY, fetchImpl);
  const tastyKey = env.TASTY_API_KEY ?? env.TASTY_RAPIDAPI_KEY;
  if (provider === 'tasty' && tastyKey) return tastyRecipe(id, tastyKey, fetchImpl);
  throw new Error('That recipe source is not configured.');
}

export async function handleRecipeIdeasRequest(request: Request, env: RecipeIdeasEnv = {}, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return reply(405, { error: 'Not allowed' });
  const params = new URL(request.url).searchParams;
  const detailProvider = params.get('provider');
  const detailId = params.get('id')?.trim();
  if (detailProvider && detailId) {
    try {
      return reply(200, { recipe: await providerRecipe(detailProvider, detailId, env, fetchImpl) });
    } catch {
      return reply(502, { error: 'That recipe could not be opened right now.' });
    }
  }
  const query = params.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 120) return reply(400, { error: 'Search for at least two characters.' });
  const tastyKey = env.TASTY_API_KEY ?? env.TASTY_RAPIDAPI_KEY;
  const providers: { id: SearchPage['provider']; run: () => Promise<SearchPage[]> }[] = [
    { id: 'wikibooks', run: () => wikibooks(query, fetchImpl) },
    ...(env.SPOONACULAR_API_KEY ? [{ id: 'spoonacular' as const, run: () => spoonacular(query, env.SPOONACULAR_API_KEY!, fetchImpl) }] : []),
    ...(tastyKey ? [{ id: 'tasty' as const, run: () => tasty(query, tastyKey, fetchImpl) }] : []),
  ];
  const results = await Promise.all(providers.map(async (provider) => {
    try {
      const items = await provider.run();
      return { id: provider.id, items, status: 'ok' as const };
    } catch {
      return { id: provider.id, items: [], status: 'error' as const };
    }
  }));
  const search = results.flatMap((result) => result.items);
  const sources = Object.fromEntries(results.map((result) => [result.id, { status: result.status, count: result.items.length }]));
  return reply(200, { query: { search }, configured: { spoonacular: Boolean(env.SPOONACULAR_API_KEY), tasty: Boolean(tastyKey) }, sources });
}
