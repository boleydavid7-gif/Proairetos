import { tooOften } from './safeFetch';

/*
 * Poreia's flight status on the day: one flight by its number and local date, from AeroDataBox (through RapidAPI, the
 * secret AERODATABOX_KEY). Only the number and date are sent. The answer is reduced to times, terminals, gates, the
 * baggage belt and the status, and kept at the edge for five minutes so a trip's people share one look.
 */

export type FlightEnd = {
  airport?: string;
  code?: string;
  /** Local times as the airport gives them: "2026-11-02 18:30-04:00". */
  scheduled?: string;
  expected?: string;
  actual?: string;
  terminal?: string;
  gate?: string;
  desk?: string;
  belt?: string;
};

export type FlightStatus = { number: string; airline?: string; status: string; departure: FlightEnd; arrival: FlightEnd; aircraft?: string };

type Time = { local?: string; utc?: string };
type RawEnd = { airport?: { iata?: string; name?: string; shortName?: string; municipalityName?: string }; scheduledTime?: Time; revisedTime?: Time; predictedTime?: Time; runwayTime?: Time; terminal?: string; gate?: string; checkInDesk?: string; baggageBelt?: string };
type RawFlight = { number?: string; status?: string; airline?: { name?: string }; aircraft?: { model?: string }; departure?: RawEnd; arrival?: RawEnd };

const NUMBER = /^([A-Z0-9]{2})\s?(\d{1,4})[A-Z]?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function reply(status: number, body: unknown, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store', 'x-robots-tag': 'noindex' },
  });
}

const end = (raw: RawEnd | undefined, arriving: boolean): FlightEnd => ({
  airport: raw?.airport?.shortName ?? raw?.airport?.municipalityName ?? raw?.airport?.name,
  code: raw?.airport?.iata,
  scheduled: raw?.scheduledTime?.local,
  expected: raw?.revisedTime?.local ?? raw?.predictedTime?.local,
  actual: raw?.runwayTime?.local,
  terminal: raw?.terminal,
  gate: raw?.gate,
  desk: arriving ? undefined : raw?.checkInDesk,
  belt: arriving ? raw?.baggageBelt : undefined,
});

/** AeroDataBox's flights reduced to what Poreia shows; the first leg when a number flies several. */
export function readFlights(raw: RawFlight[]): FlightStatus[] {
  return raw.map((each) => ({
    number: each.number ?? '',
    airline: each.airline?.name,
    status: each.status ?? 'Unknown',
    departure: end(each.departure, false),
    arrival: end(each.arrival, true),
    aircraft: each.aircraft?.model,
  }));
}

export async function handleFlightStatus(request: Request, key: string | undefined, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (!key) return reply(503, { error: 'Flight status isn’t set up yet.' });
  const url = new URL(request.url);
  const number = (url.searchParams.get('number') ?? '').toUpperCase().replace(/\s+/g, '');
  const date = url.searchParams.get('date') ?? '';
  if (!NUMBER.test(number) || !DATE.test(date)) return reply(400, { error: 'Send a flight number and a date.' });
  if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });
  try {
    const upstream = await fetchImpl(`https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(number)}/${date}?withAircraftImage=false&withLocation=false`, {
      headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': 'aerodatabox.p.rapidapi.com' },
    });
    if (upstream.status === 204 || upstream.status === 404) return reply(200, { flights: [] }, 300);
    if (!upstream.ok) return reply(502, { error: 'Flight status couldn’t be reached. Try again.' });
    return reply(200, { flights: readFlights((await upstream.json()) as RawFlight[]) }, 300);
  } catch {
    return reply(502, { error: 'Flight status couldn’t be reached. Try again.' });
  }
}
