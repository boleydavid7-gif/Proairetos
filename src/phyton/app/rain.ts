import { useSyncExternalStore } from 'react';
import { weatherSettings } from '../../app/weather/weather';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import type { Rain } from '../core/plants';
import type { Forecast } from '../core/outdoors';

/*
 * Weather for plants outside, from Open-Meteo (free, no account): the last two weeks of daily rainfall and the
 * next three days' lows and highs at the place chosen here, or the place set for weather in Proairetos. Kept on this device only; only the place,
 * rounded to about a kilometer, is sent.
 */

type Place = { name: string; lat: number; lon: number };
type Cached = { at: string; lat: number; lon: number; days: Rain; temps?: Forecast };

const PLACE_KEY = 'phytonDevice.place';
const CACHE_KEY = 'phytonDevice.rain';
const REFRESH_MS = 3 * 60 * 60_000;
const listeners = new Set<() => void>();
let inFlight: Promise<void> | undefined;

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not kept; asked again next time.
  }
  listeners.forEach((listener) => listener());
}

const round = (n: number) => Math.round(n * 100) / 100;

export function rainPlace(): Place | undefined {
  return read<Place>(PLACE_KEY) ?? weatherSettings().place;
}

export function setRainPlace(place: Place | undefined): void {
  write(PLACE_KEY, place ? { ...place, lat: round(place.lat), lon: round(place.lon) } : undefined);
  write(CACHE_KEY, undefined);
  void refreshRain(true);
}

/** Rain by day for the chosen place, as last fetched. */
export function rainNow(): Rain {
  const place = rainPlace();
  const cached = read<Cached>(CACHE_KEY);
  if (!place || !cached || cached.lat !== round(place.lat) || cached.lon !== round(place.lon)) return {};
  return cached.days;
}

/** Lows and highs by day (°C) for the chosen place, as last fetched. */
export function forecastNow(): Forecast {
  const place = rainPlace();
  const cached = read<Cached>(CACHE_KEY);
  if (!place || !cached || cached.lat !== round(place.lat) || cached.lon !== round(place.lon)) return {};
  return cached.temps ?? {};
}

const NONE = { rain: {} as Rain, forecast: {} as Forecast };
let snapshot: { raw: string | null; value: { rain: Rain; forecast: Forecast } } = { raw: null, value: NONE };
function current() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CACHE_KEY) + '|' + localStorage.getItem(PLACE_KEY);
  } catch {
    // Nothing kept.
  }
  if (raw !== snapshot.raw) snapshot = { raw, value: { rain: rainNow(), forecast: forecastNow() } };
  return snapshot.value;
}

function useOutdoors(on: boolean) {
  const value = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current,
  );
  return on ? value : NONE;
}

/** Rain by day while `on`; nothing otherwise. */
export function useRain(on: boolean): Rain {
  return useOutdoors(on).rain;
}

/** Lows and highs by day while `on`; nothing otherwise. */
export function useForecast(on: boolean): Forecast {
  return useOutdoors(on).forecast;
}

export function refreshRain(force = false): Promise<void> {
  const place = rainPlace();
  if (!place || (typeof navigator !== 'undefined' && !navigator.onLine)) return Promise.resolve();
  const cached = read<Cached>(CACHE_KEY);
  if (!force && cached && cached.lat === round(place.lat) && cached.lon === round(place.lon) && Date.now() - new Date(cached.at).getTime() < REFRESH_MS) return Promise.resolve();
  inFlight ??= (async () => {
    const params = new URLSearchParams({ latitude: String(round(place.lat)), longitude: String(round(place.lon)), daily: 'precipitation_sum,temperature_2m_min,temperature_2m_max', past_days: '14', forecast_days: '3', timezone: 'auto' });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) return;
    const data = (await response.json()) as { daily?: { time: string[]; precipitation_sum: (number | null)[]; temperature_2m_min?: (number | null)[]; temperature_2m_max?: (number | null)[] } };
    const days: Rain = {};
    const temps: Forecast = {};
    const today = toLocalDate(new Date());
    data.daily?.time.forEach((day, index) => {
      const mm = data.daily!.precipitation_sum[index];
      if (typeof mm === 'number' && mm > 0 && day <= today) days[day] = mm;
      const min = data.daily!.temperature_2m_min?.[index];
      const max = data.daily!.temperature_2m_max?.[index];
      if (typeof min === 'number' && typeof max === 'number' && day >= addDays(today, -1)) temps[day] = { min, max };
    });
    write(CACHE_KEY, { at: new Date().toISOString(), lat: round(place.lat), lon: round(place.lon), days, temps } satisfies Cached);
  })()
    .catch(() => undefined)
    .finally(() => {
      inFlight = undefined;
    });
  return inFlight;
}
