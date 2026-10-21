import { tooOften } from './safeFetch';

/**
 * Poreia's searches with prices, through the site so the keys stay on the server. Stays come from LiteAPI (the secret
 * LITEAPI_KEY) and flights from Duffel (the secret DUFFEL_KEY); each is optional, and GET /api/travel says which are set
 * up. Only what a search needs is passed on: a place's coordinates or airport codes, dates and the party's size.
 * Nothing is stored. Answers are reduced to what Poreia shows.
 */

export type TravelKeys = { TICKETMASTER_KEY?: string; LITEAPI_KEY?: string; DUFFEL_KEY?: string };

export type StayOffer = {
  id: string;
  name: string;
  address?: string;
  stars?: number;
  rating?: number;
  reviews?: number;
  photo?: string;
  lat?: number;
  lon?: number;
  /** For the whole stay, in the currency asked for. */
  price?: { amount: number; currency: string };
  room?: string;
  board?: string;
  refundable?: boolean;
};

export type FlightOffer = {
  id: string;
  airline: string;
  price: { amount: number; currency: string };
  slices: { from: string; to: string; departs: string; arrives: string; minutes: number; stops: number; flights: string[] }[];
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CODE = /^[A-Z]{3}$/;

async function body(request: Request): Promise<Record<string, unknown> | undefined> {
  if (request.method !== 'POST') return undefined;
  const text = await request.text();
  if (text.length > 4000) return undefined;
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

const sameSite = (request: Request) => {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
};

// ---------- Stays ----------

type LiteRates = {
  data?: { hotelId: string; roomTypes?: { name?: string; rates?: { name?: string; boardName?: string; retailRate?: { total?: { amount: number; currency: string }[] }; cancellationPolicies?: { refundableTag?: string } }[] }[] }[];
  hotels?: { id: string; name: string; main_photo?: string; thumbnail?: string; address?: string; rating?: number; stars?: number; reviewCount?: number; latitude?: number; longitude?: number }[];
};

/** LiteAPI's rates and hotel details joined, cheapest first. */
export function readStays(data: LiteRates): StayOffer[] {
  const hotels = new Map((data.hotels ?? []).map((hotel) => [hotel.id, hotel]));
  const offers: StayOffer[] = [];
  for (const entry of data.data ?? []) {
    const hotel = hotels.get(entry.hotelId);
    let best: StayOffer | undefined;
    for (const room of entry.roomTypes ?? []) {
      for (const rate of room.rates ?? []) {
        const total = rate.retailRate?.total?.[0];
        if (!total || !(total.amount > 0)) continue;
        if (!best?.price || total.amount < best.price.amount) {
          best = {
            id: entry.hotelId,
            name: hotel?.name ?? 'Hotel',
            address: hotel?.address,
            stars: hotel?.stars,
            rating: hotel?.rating,
            reviews: hotel?.reviewCount,
            photo: hotel?.main_photo ?? hotel?.thumbnail,
            lat: hotel?.latitude,
            lon: hotel?.longitude,
            price: { amount: Math.round(total.amount * 100) / 100, currency: total.currency },
            room: rate.name ?? room.name,
            board: rate.boardName,
            refundable: rate.cancellationPolicies?.refundableTag === 'RFN',
          };
        }
      }
    }
    if (best) offers.push(best);
  }
  return offers.sort((a, b) => (a.price?.amount ?? Infinity) - (b.price?.amount ?? Infinity));
}

async function stays(request: Request, key: string, fetchImpl: typeof fetch): Promise<Response> {
  const ask = await body(request);
  if (!ask) return reply(400, { error: 'A place and dates are needed.' });
  const lat = Number(ask.lat);
  const lon = Number(ask.lon);
  const checkin = String(ask.checkin ?? '');
  const checkout = String(ask.checkout ?? '');
  const adults = Math.min(8, Math.max(1, Math.round(Number(ask.adults) || 1)));
  const currency = /^[A-Z]{3}$/.test(String(ask.currency)) ? String(ask.currency) : 'USD';
  const nationality = /^[A-Z]{2}$/.test(String(ask.nationality)) ? String(ask.nationality) : 'US';
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !DATE.test(checkin) || !DATE.test(checkout) || checkout <= checkin) {
    return reply(400, { error: 'A place and dates are needed.' });
  }
  let upstream: Response;
  try {
    upstream = await fetchImpl('https://api.liteapi.travel/v3.0/hotels/rates', {
      method: 'POST',
      headers: { 'X-API-Key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lon, radius: 6000, checkin, checkout, currency, guestNationality: nationality, occupancies: [{ adults }], limit: 40, maxRatesPerHotel: 3, includeHotelData: true, timeout: 12 }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return reply(502, { error: 'Couldn’t reach the stays search. Try again later.' });
  }
  if (!upstream.ok) return reply(502, { error: `The stays search answered with ${upstream.status}.` });
  try {
    return reply(200, { stays: readStays((await upstream.json()) as LiteRates).slice(0, 40) });
  } catch {
    return reply(502, { error: 'Couldn’t read the stays search’s answer.' });
  }
}

// ---------- Flights ----------

type DuffelOffers = {
  data?: {
    offers?: {
      id: string;
      total_amount: string;
      total_currency: string;
      owner?: { name?: string };
      slices?: { duration?: string; segments?: { departing_at: string; arriving_at: string; origin?: { iata_code?: string }; destination?: { iata_code?: string }; marketing_carrier?: { iata_code?: string }; marketing_carrier_flight_number?: string }[] }[];
    }[];
  };
};

/** "PT2H26M" in minutes. */
export function isoMinutes(duration?: string): number {
  const match = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(duration ?? '');
  if (!match) return 0;
  return Number(match[1] ?? 0) * 1440 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

/** Duffel's offers, cheapest first, one per airline and set of times. */
export function readFlights(data: DuffelOffers): FlightOffer[] {
  const offers: FlightOffer[] = [];
  const seen = new Set<string>();
  for (const offer of data.data?.offers ?? []) {
    const slices = (offer.slices ?? []).map((slice) => {
      const segments = slice.segments ?? [];
      const first = segments[0];
      const last = segments[segments.length - 1];
      return {
        from: first?.origin?.iata_code ?? '',
        to: last?.destination?.iata_code ?? '',
        departs: first?.departing_at ?? '',
        arrives: last?.arriving_at ?? '',
        minutes: isoMinutes(slice.duration),
        stops: Math.max(0, segments.length - 1),
        flights: segments.map((segment) => `${segment.marketing_carrier?.iata_code ?? ''} ${segment.marketing_carrier_flight_number ?? ''}`.trim()),
      };
    });
    const key = `${offer.owner?.name}|${slices.map((slice) => slice.departs + slice.flights.join()).join('|')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    offers.push({ id: offer.id, airline: offer.owner?.name ?? 'Airline', price: { amount: Number(offer.total_amount), currency: offer.total_currency }, slices });
  }
  return offers.sort((a, b) => a.price.amount - b.price.amount);
}

async function flights(request: Request, key: string, fetchImpl: typeof fetch): Promise<Response> {
  const ask = await body(request);
  const from = String(ask?.from ?? '').toUpperCase();
  const to = String(ask?.to ?? '').toUpperCase();
  const depart = String(ask?.depart ?? '');
  const back = ask?.return ? String(ask.return) : undefined;
  const adults = Math.min(8, Math.max(1, Math.round(Number(ask?.adults) || 1)));
  const cabin = ['economy', 'premium_economy', 'business', 'first'].includes(String(ask?.cabin)) ? String(ask?.cabin) : 'economy';
  if (!CODE.test(from) || !CODE.test(to) || !DATE.test(depart) || (back !== undefined && (!DATE.test(back) || back < depart))) {
    return reply(400, { error: 'Two airports and a date are needed.' });
  }
  const slices = [{ origin: from, destination: to, departure_date: depart }, ...(back ? [{ origin: to, destination: from, departure_date: back }] : [])];
  let upstream: Response;
  try {
    upstream = await fetchImpl('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=15000', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Duffel-Version': 'v2', 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ data: { slices, passengers: Array.from({ length: adults }, () => ({ type: 'adult' })), cabin_class: cabin, max_connections: 1 } }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return reply(502, { error: 'Couldn’t reach the flight search. Try again later.' });
  }
  if (!upstream.ok) return reply(502, { error: `The flight search answered with ${upstream.status}.` });
  try {
    return reply(200, { flights: readFlights((await upstream.json()) as DuffelOffers).slice(0, 30) });
  } catch {
    return reply(502, { error: 'Couldn’t read the flight search’s answer.' });
  }
}

type DuffelPlaces = { data?: { type: string; iata_code?: string; name?: string; city_name?: string; iata_country_code?: string }[] };

export function readAirports(data: DuffelPlaces): { code: string; name: string; city?: string; country?: string }[] {
  return (data.data ?? [])
    .filter((place) => place.iata_code && CODE.test(place.iata_code))
    .map((place) => ({ code: place.iata_code!, name: place.name ?? place.iata_code!, city: place.type === 'city' ? place.name : place.city_name, country: place.iata_country_code }))
    .slice(0, 8);
}

async function airports(request: Request, key: string, fetchImpl: typeof fetch): Promise<Response> {
  const query = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if (query.length < 2 || query.length > 60) return reply(400, { error: 'A place name is needed.' });
  try {
    const upstream = await fetchImpl(`https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${key}`, 'Duffel-Version': 'v2', accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) return reply(502, { error: `The airport search answered with ${upstream.status}.` });
    return reply(200, { airports: readAirports((await upstream.json()) as DuffelPlaces) });
  } catch {
    return reply(502, { error: 'Couldn’t reach the airport search.' });
  }
}

/** `/api/travel` (what is set up), `/api/travel/stays`, `/api/travel/flights`, `/api/travel/airports`. */
export async function handleTravelSearch(request: Request, keys: TravelKeys, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  if (path === '/api/travel') return reply(200, { events: Boolean(keys.TICKETMASTER_KEY), stays: Boolean(keys.LITEAPI_KEY), flights: Boolean(keys.DUFFEL_KEY) });
  if (!sameSite(request)) return reply(403, { error: 'Not allowed' });
  const which = path.slice('/api/travel/'.length);
  const key = which === 'stays' ? keys.LITEAPI_KEY : which === 'flights' || which === 'airports' ? keys.DUFFEL_KEY : undefined;
  if (!['stays', 'flights', 'airports'].includes(which)) return reply(404, { error: 'Not found' });
  if (!key) return reply(503, { error: 'This search isn’t set up yet.' });
  if (tooOften(request)) return reply(429, { error: 'Too many searches. Try again in a minute.' });
  if (which === 'stays') return stays(request, key, fetchImpl);
  if (which === 'flights') return flights(request, key, fetchImpl);
  return airports(request, key, fetchImpl);
}
