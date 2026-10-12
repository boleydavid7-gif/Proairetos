import { useSyncExternalStore } from 'react';
import { weatherSettings } from '../../app/weather/weather';
import type { Rain } from '../core/plants';

/*
 * Rain for plants outside, from Open-Meteo (free, no account): the last two weeks of daily rainfall at the
 * place chosen here, or the place set for weather in Proairetos. Kept on this device only; only the place,
 * rounded to about a kilometre, is sent.
 */

type Place = { name: string; lat: number; lon: number };
type Cached = { at: string; lat: number; lon: number; days: Rain };

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

let snapshot: { raw: string | null; value: Rain } = { raw: null, value: {} };
function current(): Rain {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CACHE_KEY) + '|' + localStorage.getItem(PLACE_KEY);
  } catch {
    // Nothing kept.
  }
  if (raw !== snapshot.raw) snapshot = { raw, value: rainNow() };
  return snapshot.value;
}

/** Rain by day while `on`; nothing otherwise. */
export function useRain(on: boolean): Rain {
  const rain = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current,
  );
  return on ? rain : {};
}

export function refreshRain(force = false): Promise<void> {
  const place = rainPlace();
  if (!place || (typeof navigator !== 'undefined' && !navigator.onLine)) return Promise.resolve();
  const cached = read<Cached>(CACHE_KEY);
  if (!force && cached && cached.lat === round(place.lat) && cached.lon === round(place.lon) && Date.now() - new Date(cached.at).getTime() < REFRESH_MS) return Promise.resolve();
  inFlight ??= (async () => {
    const params = new URLSearchParams({ latitude: String(round(place.lat)), longitude: String(round(place.lon)), daily: 'precipitation_sum', past_days: '14', forecast_days: '1', timezone: 'auto' });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) return;
    const data = (await response.json()) as { daily?: { time: string[]; precipitation_sum: (number | null)[] } };
    const days: Rain = {};
    data.daily?.time.forEach((day, index) => {
      const mm = data.daily!.precipitation_sum[index];
      if (typeof mm === 'number' && mm > 0) days[day] = mm;
    });
    write(CACHE_KEY, { at: new Date().toISOString(), lat: round(place.lat), lon: round(place.lon), days } satisfies Cached);
  })()
    .catch(() => undefined)
    .finally(() => {
      inFlight = undefined;
    });
  return inFlight;
}
