/** Server-side recipe search: the community Cookbook on Wikibooks (free, no key). Paid providers were removed (Nov 5). */
export type RecipeIdeasEnv = Record<never, never>;

type SearchPage = { pageid: string; title: string; provider: 'wikibooks'; image?: string; url?: string };

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

export async function handleRecipeIdeasRequest(request: Request, _env: RecipeIdeasEnv = {}, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return reply(405, { error: 'Not allowed' });
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 120) return reply(400, { error: 'Search for at least two characters.' });
  try {
    const search = await wikibooks(query, fetchImpl);
    return reply(200, { query: { search }, sources: { wikibooks: { status: 'ok', count: search.length } } });
  } catch {
    return reply(200, { query: { search: [] }, sources: { wikibooks: { status: 'error', count: 0 } } });
  }
}
