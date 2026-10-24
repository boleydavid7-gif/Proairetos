/** Server-side recipe search fan-in. Provider keys stay in Worker secrets. */
export type RecipeIdeasEnv = { SPOONACULAR_API_KEY?: string; TASTY_API_KEY?: string; TASTY_RAPIDAPI_KEY?: string };

type SearchPage = { pageid: string; title: string; provider: 'wikibooks' | 'spoonacular' | 'tasty'; image?: string; url?: string };

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}

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

export async function handleRecipeIdeasRequest(request: Request, env: RecipeIdeasEnv = {}, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return reply(405, { error: 'Not allowed' });
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 120) return reply(400, { error: 'Search for at least two characters.' });
  const tastyKey = env.TASTY_API_KEY ?? env.TASTY_RAPIDAPI_KEY;
  const providers = [
    wikibooks(query, fetchImpl),
    ...(env.SPOONACULAR_API_KEY ? [spoonacular(query, env.SPOONACULAR_API_KEY, fetchImpl)] : []),
    ...(tastyKey ? [tasty(query, tastyKey, fetchImpl)] : []),
  ];
  const results = await Promise.allSettled(providers);
  const search = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  return reply(200, { query: { search }, configured: { spoonacular: Boolean(env.SPOONACULAR_API_KEY), tasty: Boolean(tastyKey) } });
}
