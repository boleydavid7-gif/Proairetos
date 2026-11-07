import { tooOften } from './safeFetch';

/**
 * Events near a trip's place for Poreia, through Ticketmaster's Discovery API, keeping the key on the server (the
 * secret TICKETMASTER_KEY: free and self-serve at developer.ticketmaster.com). Only the place's coordinates and the
 * trip's dates are passed on; nothing is stored. GET with no question answers whether it is set up.
 */

export type TravelEvent = { id: string; name: string; date?: string; time?: string; venue?: string; url: string; image?: string; kind?: string; price?: string; lat?: number; lon?: number };

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

type Upstream = {
  _embedded?: {
    events?: {
      id: string;
      name: string;
      url: string;
      dates?: { start?: { localDate?: string; localTime?: string } };
      images?: { url: string; width: number; ratio?: string }[];
      classifications?: { segment?: { name?: string }; genre?: { name?: string } }[];
      priceRanges?: { min?: number; max?: number; currency?: string }[];
      _embedded?: { venues?: { name?: string; city?: { name?: string }; location?: { latitude?: string; longitude?: string } }[] };
    }[];
  };
};

/** Ticketmaster's answer, reduced to what Poreia shows. */
export function readEvents(data: Upstream): TravelEvent[] {
  return (data._embedded?.events ?? []).map((event) => {
    const image = [...(event.images ?? [])].filter((each) => each.ratio === '16_9').sort((a, b) => a.width - b.width).find((each) => each.width >= 300) ?? event.images?.[0];
    const price = event.priceRanges?.[0];
    const genre = event.classifications?.[0]?.genre?.name;
    return {
      id: event.id,
      name: event.name,
      date: event.dates?.start?.localDate,
      time: event.dates?.start?.localTime?.slice(0, 5),
      venue: [event._embedded?.venues?.[0]?.name, event._embedded?.venues?.[0]?.city?.name].filter(Boolean).join(', ') || undefined,
      url: event.url,
      image: image?.url,
      kind: genre && genre !== 'Undefined' ? genre : event.classifications?.[0]?.segment?.name,
      lat: Number.parseFloat(event._embedded?.venues?.[0]?.location?.latitude ?? '') || undefined,
      lon: Number.parseFloat(event._embedded?.venues?.[0]?.location?.longitude ?? '') || undefined,
      price: price?.min ? `${price.currency ?? ''} ${Math.round(price.min)}${price.max && price.max !== price.min ? `–${Math.round(price.max)}` : ''}`.trim() : undefined,
    };
  });
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function handleTravelEvents(request: Request, key: string | undefined, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return reply(405, { error: 'Not allowed' });
  const url = new URL(request.url);
  if (!url.searchParams.has('lat')) return reply(200, { ready: Boolean(key) });
  if (!key) return reply(503, { error: 'Events are not set up yet.' });
  if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  const start = url.searchParams.get('start') ?? '';
  const end = url.searchParams.get('end') ?? '';
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !DATE.test(start) || !DATE.test(end)) return reply(400, { error: 'A place and dates are needed.' });
  const params = new URLSearchParams({
    apikey: key,
    latlong: `${lat.toFixed(4)},${lon.toFixed(4)}`,
    radius: '30',
    unit: 'km',
    startDateTime: `${start}T00:00:00Z`,
    endDateTime: `${end}T23:59:59Z`,
    sort: 'date,asc',
    size: '40',
  });
  let upstream: Response;
  try {
    upstream = await fetchImpl(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, { signal: AbortSignal.timeout(15_000) });
  } catch {
    return reply(502, { error: 'Ticketmaster could not be reached. Try again later.' });
  }
  if (!upstream.ok) return reply(502, { error: `Ticketmaster answered with ${upstream.status}.` });
  try {
    return reply(200, { events: readEvents((await upstream.json()) as Upstream) });
  } catch {
    return reply(502, { error: 'Ticketmaster’s answer could not be read.' });
  }
}
