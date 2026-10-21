import { overpassQuery, SPOT_CATEGORIES, type SpotCategory } from '../src/poreia/core/spots';
import { tooOften } from './safeFetch';

/**
 * Places near a trip for Poreia, from OpenStreetMap through the public Overpass servers. Phones asking Overpass
 * themselves are often turned away (busy servers, shared mobile addresses), so the site asks with its own name, tries
 * the servers together and keeps each answer at the edge for a day. When Overpass is slow or down, OpenStreetMap's own
 * search (Nominatim) is asked by kind within the same area. Only a category and rounded coordinates are sent.
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

// ---------- Nominatim, when Overpass cannot answer ----------

/** Nominatim's special phrases for each kind, a few each, asked one a second as its usage policy asks. */
const PHRASES: Record<Exclude<SpotCategory, 'event'>, string[]> = {
  see: ['attraction', 'viewpoint', 'monument', 'castle'],
  do: ['museum', 'theatre', 'cinema', 'zoo'],
  eat: ['restaurant', 'fast food'],
  coffee: ['cafe', 'bakery', 'ice cream'],
  drink: ['bar', 'nightclub'],
  outdoors: ['park', 'garden', 'beach'],
  sleep: ['hotel', 'hostel', 'guest house'],
  shop: ['supermarket', 'marketplace', 'mall'],
  around: ['car rental', 'bicycle rental', 'railway station', 'taxi'],
  essentials: ['pharmacy', 'hospital', 'atm', 'toilets'],
};

const KEYS = new Set(['tourism', 'historic', 'amenity', 'leisure', 'natural', 'shop', 'railway', 'public_transport']);

type Found = { osm_type?: string; osm_id?: number; lat?: string; lon?: string; category?: string; type?: string; name?: string; extratags?: Record<string, string> | null; address?: Record<string, string> };

/** Nominatim's answers in Overpass's shape, so the app reads both the same way; other kinds of thing left out. */
export function fromNominatim(found: Found[]): { type: string; id: number; lat: number; lon: number; tags: Record<string, string> }[] {
  return found
    .filter((each) => each.name && each.category && KEYS.has(each.category) && each.osm_id !== undefined)
    .map((each) => ({
      type: each.osm_type ?? 'node',
      id: each.osm_id!,
      lat: Number(each.lat),
      lon: Number(each.lon),
      tags: {
        ...(each.extratags ?? {}),
        name: each.name!,
        [each.category!]: each.type ?? 'yes',
        ...(each.address?.road ? { 'addr:street': each.address.road } : {}),
        ...(each.address?.house_number ? { 'addr:housenumber': each.address.house_number } : {}),
      },
    }));
}

export async function askNominatim(category: Exclude<SpotCategory, 'event'>, lat: number, lon: number, fetchImpl: typeof fetch = fetch, gap = 1_050): Promise<Elements> {
  // About 2 km each way, as the Overpass search.
  const dLat = 0.018;
  const dLon = 0.018 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const viewbox = [lon - dLon, lat + dLat, lon + dLon, lat - dLat].map((each) => each.toFixed(4)).join(',');
  const elements: unknown[] = [];
  let reached = false;
  for (const [index, phrase] of PHRASES[category].entries()) {
    if (index) await new Promise((resolve) => setTimeout(resolve, gap));
    const params = new URLSearchParams({ q: `[${phrase}]`, viewbox, bounded: '1', format: 'jsonv2', limit: '40', extratags: '1', addressdetails: '1' });
    try {
      const response = await fetchImpl(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'user-agent': 'Poreia (proairetos.com) trip planner', referer: 'https://proairetos.com/poreia/', 'accept-language': 'en' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) continue;
      reached = true;
      elements.push(...fromNominatim((await response.json()) as Found[]));
    } catch {
      // This phrase is left out; the others still count.
    }
  }
  if (!reached) throw new Error('nominatim unreached');
  return { elements };
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
    const kind = category as Exclude<SpotCategory, 'event'>;
    const at = { lat: Number(lat.toFixed(3)), lon: Number(lon.toFixed(3)) };
    // Overpass first; if it has not answered in a few seconds, Nominatim is asked as well and the first answer is used.
    data = await Promise.any([
      askOverpass(overpassQuery(kind, at.lat, at.lon), fetchImpl),
      new Promise<void>((resolve) => setTimeout(resolve, 4_000)).then(() => askNominatim(kind, at.lat, at.lon, fetchImpl)),
    ]);
  } catch (error) {
    const why = error instanceof AggregateError ? error.errors.map((each) => String(each instanceof Error ? each.message : each).slice(0, 80)) : [String(error).slice(0, 80)];
    return reply(502, { error: 'OpenStreetMap could not be reached. Try again later.', why });
  }
  const response = reply(200, { elements: data.elements ?? [] }, 'public, max-age=86400');
  await cache?.put(key, response.clone()).catch(() => undefined);
  return response;
}
