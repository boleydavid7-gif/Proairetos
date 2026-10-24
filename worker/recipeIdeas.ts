/** Small server-side bridge for Wikibooks Cookbook search. Keeping this at the edge avoids browser CORS and native-origin differences. */
function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}

export async function handleRecipeIdeasRequest(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return reply(405, { error: 'Not allowed' });
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 120) return reply(400, { error: 'Search for at least two characters.' });
  const params = new URLSearchParams({ action: 'query', list: 'search', srnamespace: '102', srlimit: '12', srsearch: query, format: 'json' });
  try {
    const upstream = await fetchImpl(`https://en.wikibooks.org/w/api.php?${params.toString()}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
    if (!upstream.ok) return reply(502, { error: 'Wikibooks did not answer just now.' });
    const body = (await upstream.json()) as { query?: { search?: { pageid: number; title: string }[] } };
    return reply(200, { query: { search: body.query?.search ?? [] } });
  } catch {
    return reply(502, { error: 'Wikibooks could not be reached just now.' });
  }
}
