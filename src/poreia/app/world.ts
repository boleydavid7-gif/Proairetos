import { apiUrl } from '../../app/apiBase';
import type { Place } from '../core/model';

/*
 * What Poreia reads from the outside world. Every source here is free and needs no account: Open-Meteo (places and
 * weather), Wikivoyage and Wikipedia (the guide and what is nearby), Frankfurter (exchange rates from the European
 * Central Bank), Nager.Date (public holidays) and REST Countries (country facts). Live events come through Poreia's own
 * bridge on the site (`/api/travel/events`), and only once its key is set up. Only the place name or its coordinates
 * are sent; answers are kept on this device for a while (`poreiaCache.*`, not synced, not backed up).
 */

const DAY = 86_400_000;

async function cached<T>(key: string, maxAge: number, load: () => Promise<T>): Promise<T> {
  const name = `poreiaCache.${key}`;
  try {
    const raw = localStorage.getItem(name);
    if (raw) {
      const { at, value } = JSON.parse(raw) as { at: number; value: T };
      if (Date.now() - at < maxAge) return value;
    }
  } catch {
    // Unreadable: load again.
  }
  const value = await load();
  try {
    localStorage.setItem(name, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Full: the answer is used without keeping it.
  }
  return value;
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}`);
  return (await response.json()) as T;
}

// ---------- Places ----------

type GeoResult = { name: string; country?: string; country_code?: string; admin1?: string; latitude: number; longitude: number; timezone?: string; feature_code?: string };

/** Places matching a name, biggest first (Open-Meteo's place search, from GeoNames). */
export async function findPlaces(query: string): Promise<Place[]> {
  const text = query.trim();
  if (text.length < 2) return [];
  const data = await cached(`places.${text.toLowerCase()}`, 30 * DAY, () => json<{ results?: GeoResult[] }>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=8&language=en&format=json`));
  return (data.results ?? []).map((each) => ({
    name: each.name,
    label: [each.name, each.admin1 && each.admin1 !== each.name ? each.admin1 : undefined, each.country].filter(Boolean).join(', '),
    country: each.country,
    countryCode: each.country_code,
    lat: each.latitude,
    lon: each.longitude,
    timezone: each.timezone,
  }));
}

// ---------- Weather ----------

export type DayWeather = { date: string; high: number; low: number; rain?: number; code?: number };

/** The next 16 days at a place (°C, rain chance in %). */
export async function forecast(lat: number, lon: number): Promise<DayWeather[]> {
  const key = `forecast.${lat.toFixed(2)},${lon.toFixed(2)}`;
  const data = await cached(key, 3 * 3_600_000, () =>
    json<{ daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max?: (number | null)[]; weather_code?: number[] } }>(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=16`,
    ),
  );
  return data.daily.time.map((date, i) => ({ date, high: data.daily.temperature_2m_max[i], low: data.daily.temperature_2m_min[i], rain: data.daily.precipitation_probability_max?.[i] ?? undefined, code: data.daily.weather_code?.[i] }));
}

/** The same dates a year ago, as recorded: what the weather usually brings when the trip is too far off to forecast. */
export async function lastYear(lat: number, lon: number, start: string, end: string): Promise<DayWeather[]> {
  const shift = (date: string) => `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`;
  const from = shift(start);
  const until = shift(end < start ? start : end);
  const key = `lastyear.${lat.toFixed(2)},${lon.toFixed(2)}.${from}.${until}`;
  const data = await cached(key, 180 * DAY, () =>
    json<{ daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[] } }>(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${from}&end_date=${until}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`,
    ),
  );
  return data.daily.time.map((date, i) => ({ date, high: data.daily.temperature_2m_max[i], low: data.daily.temperature_2m_min[i], rain: data.daily.precipitation_sum[i] }));
}

/** WMO weather codes, as words. */
export function skyWord(code?: number): string {
  if (code === undefined) return '';
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorms';
}

export const degrees = (celsius: number, unit: 'C' | 'F') => `${Math.round(unit === 'F' ? (celsius * 9) / 5 + 32 : celsius)}°`;

// ---------- The guide ----------

export type Guide = { title: string; text: string; image?: string; url: string; source: 'Wikivoyage' | 'Wikipedia' };

/** Wikivoyage's opening for a place, else Wikipedia's (both CC BY-SA, credited and linked). */
export async function guideFor(place: Place): Promise<Guide | undefined> {
  type Summary = { type?: string; title: string; extract?: string; thumbnail?: { source: string }; content_urls?: { desktop?: { page?: string } } };
  const tryOne = async (host: string, title: string, source: Guide['source']): Promise<Guide | undefined> => {
    try {
      const data = await json<Summary>(`https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
      if (!data.extract || data.type === 'disambiguation') return undefined;
      return { title: data.title, text: data.extract, image: data.thumbnail?.source, url: data.content_urls?.desktop?.page ?? `https://${host}/wiki/${encodeURIComponent(title)}`, source };
    } catch {
      return undefined;
    }
  };
  return cached(`guide.${place.label ?? place.name}`, 14 * DAY, async () => (await tryOne('en.wikivoyage.org', place.name, 'Wikivoyage')) ?? (await tryOne('en.wikipedia.org', place.name, 'Wikipedia')));
}

export type Sight = { title: string; description?: string; image?: string; meters: number; url: string; lat: number; lon: number };

/** Notable places within 10 km, nearest first, from Wikipedia's map of articles. */
export async function sightsNear(lat: number, lon: number): Promise<Sight[]> {
  type Page = { title: string; description?: string; thumbnail?: { source: string }; coordinates?: { lat: number; lon: number; dist?: number }[] };
  const data = await cached(`sights.${lat.toFixed(3)},${lon.toFixed(3)}`, 30 * DAY, () =>
    json<{ query?: { pages?: Record<string, Page> } }>(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord=${lat}%7C${lon}&ggsradius=10000&ggslimit=40&prop=coordinates%7Cpageimages%7Cdescription&piprop=thumbnail&pithumbsize=240&colimit=40&coprop=dist&codistancefrompoint=${lat}%7C${lon}`,
    ),
  );
  return Object.values(data.query?.pages ?? {})
    .filter((page) => page.coordinates?.[0])
    .map((page) => ({
      title: page.title,
      description: page.description,
      image: page.thumbnail?.source,
      meters: Math.round(page.coordinates![0].dist ?? 0),
      lat: page.coordinates![0].lat,
      lon: page.coordinates![0].lon,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    }))
    .filter((sight) => !/^(List of|Outline of)/.test(sight.title))
    .sort((a, b) => a.meters - b.meters);
}

// ---------- Money, holidays, country ----------

/** How many of `base` one unit of each other currency is worth (European Central Bank reference rates). */
export async function ratesInto(base: string): Promise<Record<string, number>> {
  const data = await cached(`rates.${base}`, DAY / 2, () => json<{ rates: Record<string, number> }>(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`));
  const into: Record<string, number> = {};
  for (const [code, perBase] of Object.entries(data.rates)) if (perBase) into[code] = 1 / perBase;
  return into;
}

export type Holiday = { date: string; name: string; localName: string };

export async function holidays(countryCode: string, year: number): Promise<Holiday[]> {
  return cached(`holidays.${countryCode}.${year}`, 30 * DAY, () => json<Holiday[]>(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode.toUpperCase()}`)).catch(() => []);
}

export type Country = { name: string; capital?: string; currencies: { code: string; name: string; symbol?: string }[]; languages: string[]; drives?: 'left' | 'right'; callingCode?: string; flag?: string };

export async function countryFacts(countryCode: string): Promise<Country | undefined> {
  type Raw = { name: { common: string }; capital?: string[]; currencies?: Record<string, { name: string; symbol?: string }>; languages?: Record<string, string>; car?: { side?: 'left' | 'right' }; idd?: { root?: string; suffixes?: string[] }; flag?: string };
  try {
    const raw = await cached(`country.${countryCode}`, 90 * DAY, () => json<Raw>(`https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,capital,currencies,languages,car,idd,flag`));
    return {
      name: raw.name.common,
      capital: raw.capital?.[0],
      currencies: Object.entries(raw.currencies ?? {}).map(([code, each]) => ({ code, name: each.name, symbol: each.symbol })),
      languages: Object.values(raw.languages ?? {}),
      drives: raw.car?.side,
      callingCode: raw.idd?.root ? `${raw.idd.root}${raw.idd.suffixes?.length === 1 ? raw.idd.suffixes[0] : ''}` : undefined,
      flag: raw.flag,
    };
  } catch {
    return undefined;
  }
}

// ---------- Live events ----------

export type LiveEvent = { id: string; name: string; date?: string; time?: string; venue?: string; url: string; image?: string; kind?: string; price?: string };

/** Whether the site has its events key (Ticketmaster's free Discovery key). */
export async function eventsReady(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('/api/travel/events'));
    return response.ok && ((await response.json()) as { ready?: boolean }).ready === true;
  } catch {
    return false;
  }
}

export async function eventsNear(lat: number, lon: number, start: string, end: string): Promise<LiveEvent[]> {
  return cached(`events.${lat.toFixed(2)},${lon.toFixed(2)}.${start}.${end}`, 6 * 3_600_000, async () => {
    const response = await fetch(apiUrl(`/api/travel/events?lat=${lat}&lon=${lon}&start=${start}&end=${end}`));
    if (!response.ok) throw new Error(`${response.status}`);
    return ((await response.json()) as { events: LiveEvent[] }).events;
  });
}
