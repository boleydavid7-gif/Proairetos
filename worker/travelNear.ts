import { overpassQuery, SPOT_CATEGORIES, type SpotCategory } from '../src/poreia/core/spots';
import { tooOften } from './safeFetch';

/**
 * Places near a trip for Poreia, from OpenStreetMap through the public Overpass servers. Phones asking Overpass
 * themselves are often turned away (busy servers, shared mobile addresses), so the site asks with its own name, tries
 * the servers together and keeps each answer at the edge for a day. Only a category and rounded coordinates are sent.
 */

const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const KINDS = new Set<string>(SPOT_CATEGORIES.map((each) => each.id));

function reply(status: number, body: unknown, cache = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache, 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

type Elements = { elements?: unknown[]; remark?: string };

/** The first useful answer from the servers, the main one first and the others after a short wait. */
export async function askOverpass(query: string, fetchImpl: typeof fetch = fetch, gap = 2_000): Promise<Elements> {
  const asked: AbortController[] = [];
  let answered = false;
  const ask = async (server: string, wait: number): Promise<Elements> => {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    if (answered) throw new Error('answered');
    const one = new AbortController();
    asked.push(one);
    const timer = setTimeout(() => one.abort(), 25_000);
    try {
      const response = await fetchImpl(server, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'Poreia (proairetos.com) trip planner', accept: 'application/json' },
        body: new URLSearchParams({ data: query }),
        signal: one.signal,
      });
      if (!response.ok) throw new Error(`${new URL(server).host} ${response.status}`);
      const data = (await response.json()) as Elements;
      // A server that ran out of time still answers 200, with a remark and no places.
      if (!data.elements?.length && data.remark) throw new Error(data.remark);
      return data;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    return await Promise.any(SERVERS.map((server, index) => ask(server, index * gap)));
  } finally {
    answered = true;
    asked.forEach((each) => each.abort());
  }
}

type EdgeCache = { match: (key: Request) => Promise<Response | undefined>; put: (key: Request, response: Response) => Promise<void> };
const edge = (): EdgeCache | undefined => (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default;

export async function handleTravelNear(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return reply(405, { error: 'Not allowed' });
  const url = new URL(request.url);
  const category = url.searchParams.get('category') ?? '';
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!KINDS.has(category) || category === 'event' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return reply(400, { error: 'A kind and a place are needed.' });
  // Rounded to about 100 m, so nearby asks share one kept answer.
  const key = new Request(`https://proairetos.com/api/travel/near?category=${category}&lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`);
  const cache = edge();
  const kept = await cache?.match(key).catch(() => undefined);
  if (kept) return kept;
  if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });
  let data: Elements;
  try {
    data = await askOverpass(overpassQuery(category as Exclude<SpotCategory, 'event'>, Number(lat.toFixed(3)), Number(lon.toFixed(3))), fetchImpl);
  } catch (error) {
    const why = error instanceof AggregateError ? error.errors.map((each) => String(each instanceof Error ? each.message : each).slice(0, 80)) : [String(error).slice(0, 80)];
    return reply(502, { error: 'OpenStreetMap could not be reached. Try again later.', why });
  }
  const response = reply(200, { elements: data.elements ?? [] }, 'public, max-age=86400');
  await cache?.put(key, response.clone()).catch(() => undefined);
  return response;
}
