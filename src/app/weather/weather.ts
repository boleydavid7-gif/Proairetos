import type { Sky } from '../../core/weather/sky';
import { createListeners } from '../../services/listeners';

/**
 * Outdoor weather from Open-Meteo (free, no account, no tracking). Off until
 * the person turns it on. The place is kept on this device, rounded to about
 * a kilometre; only that rounded place is sent, to ask for the forecast.
 */
export type WeatherSettings = {
  on: boolean;
  place?: { name: string; lat: number; lon: number };
  unit: 'C' | 'F';
};

type Cached = { at: string; sky: Sky };

const SETTINGS_KEY = 'proairetos.weather';
const CACHE_KEY = 'proairetos.weather.now';
const REFRESH_MS = 30 * 60_000;
/** A reading older than this is not recorded with a reflection. */
const FRESH_FOR_MS = 2 * 60 * 60_000;

const listeners = createListeners();
let inFlight: Promise<void> | null = null;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not kept this time; the next refresh tries again.
  }
}

const defaultUnit = (): 'C' | 'F' => (/-(US|LR|MM)\b/.test(typeof navigator === 'undefined' ? '' : navigator.language) ? 'F' : 'C');
const round = (n: number) => Math.round(n * 100) / 100;

export function weatherSettings(): WeatherSettings {
  return { on: false, unit: defaultUnit(), ...read<Partial<WeatherSettings>>(SETTINGS_KEY) };
}

export function saveWeatherSettings(settings: WeatherSettings): void {
  write(SETTINGS_KEY, settings.place ? { ...settings, place: { ...settings.place, lat: round(settings.place.lat), lon: round(settings.place.lon) } } : settings);
  write(CACHE_KEY, null);
  listeners.notify();
  void weather.refresh(true);
}

async function fetchSky(settings: WeatherSettings): Promise<Sky> {
  const { lat, lon } = settings.place!;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code,is_day',
    temperature_unit: settings.unit === 'F' ? 'fahrenheit' : 'celsius',
    timezone: 'auto',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error('Weather is not available right now.');
  const data = (await response.json()) as { current?: { temperature_2m: number; weather_code: number; is_day: number } };
  if (!data.current) throw new Error('Weather is not available right now.');
  return { code: data.current.weather_code, isDay: data.current.is_day === 1, temp: Math.round(data.current.temperature_2m), unit: settings.unit };
}

export const weather = {
  subscribe: listeners.subscribe,

  /** The latest reading, if weather is on and one has arrived. */
  current(): Cached | null {
    const settings = weatherSettings();
    if (!settings.on || !settings.place) return null;
    return read<Cached>(CACHE_KEY);
  },

  /** The sky right now, for recording with a reflection: only if on and recent. */
  skyNow(): Sky | undefined {
    const cached = this.current();
    if (!cached || Date.now() - new Date(cached.at).getTime() > FRESH_FOR_MS) return undefined;
    return cached.sky;
  },

  /** Refreshes at most every 30 minutes (or now, when asked). Quietly keeps the last reading if offline. */
  refresh(force = false): Promise<void> {
    const settings = weatherSettings();
    if (!settings.on || !settings.place || (typeof navigator !== 'undefined' && !navigator.onLine)) return Promise.resolve();
    const cached = read<Cached>(CACHE_KEY);
    if (!force && cached && Date.now() - new Date(cached.at).getTime() < REFRESH_MS) return Promise.resolve();
    inFlight ??= fetchSky(settings)
      .then((sky) => {
        write(CACHE_KEY, { at: new Date().toISOString(), sky });
        listeners.notify();
      })
      .catch(() => undefined)
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  },
};

/** Looks up a town by name. Returns a few matches to choose from. */
export async function findPlace(name: string): Promise<{ name: string; lat: number; lon: number }[]> {
  const params = new URLSearchParams({ name: name.trim(), count: '5', language: navigator.language.split('-')[0] || 'en', format: 'json' });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!response.ok) throw new Error('Places could not be searched right now.');
  const data = (await response.json()) as { results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[] };
  return (data.results ?? []).map((r) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/** Uses the phone's location once, rounded to about a kilometre. */
export function placeFromDevice(): Promise<{ name: string; lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('This browser cannot share a location. Type a town instead.'));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ name: 'Near you', lat: round(position.coords.latitude), lon: round(position.coords.longitude) }),
      () => reject(new Error('Location was not shared. You can type a town instead.')),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60 * 60_000 },
    );
  });
}
