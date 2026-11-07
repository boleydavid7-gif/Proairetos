import { useEffect, useState } from 'react';
import { weatherSettings } from '../../app/weather/weather';
import type { RunHour } from '../core/runWeather';

/*
 * Weather for a run, at the place the runner is: the phone's location when they have allowed it (asked once, from a
 * tap), else the place set for Proairetos's weather. The place is rounded to about a kilometer and kept on this device
 * (`askesisDevice.place`, out of backups and sync); only it is sent to Open-Meteo, which needs no account.
 */

const PLACE = 'askesisDevice.place';
const ASIDE = 'askesisDevice.weatherAside';
const round = (n: number) => Math.round(n * 100) / 100;

type Place = { lat: number; lon: number; at: string };

function readPlace(): Place | undefined {
  try {
    return JSON.parse(localStorage.getItem(PLACE) ?? 'null') ?? undefined;
  } catch {
    return undefined;
  }
}

export const weatherSetAside = () => {
  try {
    return localStorage.getItem(ASIDE) === 'true';
  } catch {
    return false;
  }
};

export function setWeatherAside(aside: boolean): void {
  try {
    if (aside) localStorage.setItem(ASIDE, 'true');
    else localStorage.removeItem(ASIDE);
  } catch {
    // Kept for this visit only.
  }
}

/** Asks the phone where it is (from a tap the first time) and keeps the rounded place. */
export function locate(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('This device can’t share where it is.'));
    navigator.geolocation.getCurrentPosition(
      (found) => {
        const place = { lat: round(found.coords.latitude), lon: round(found.coords.longitude), at: new Date().toISOString() };
        try {
          localStorage.setItem(PLACE, JSON.stringify(place));
        } catch {
          // Used for this visit only.
        }
        resolve(place);
      },
      () => reject(new Error('Location is off for this site. Turn it on in the browser’s settings.')),
      { maximumAge: 30 * 60_000, timeout: 15_000, enableHighAccuracy: false },
    );
  });
}

/** Where to ask the weather for: a fresh look when location is already allowed, else what is kept. */
async function placeNow(): Promise<{ lat: number; lon: number } | undefined> {
  const kept = readPlace();
  try {
    const state = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    if (state?.state === 'granted' && (!kept || Date.now() - Date.parse(kept.at) > 3 * 3_600_000)) return await locate();
  } catch {
    // No permissions API: what is kept, or Proairetos's place.
  }
  if (kept) return kept;
  const proairetos = weatherSettings().place;
  return proairetos ? { lat: proairetos.lat, lon: proairetos.lon } : undefined;
}

type Hourly = { time: string[]; temperature_2m: number[]; apparent_temperature: number[]; relative_humidity_2m: number[]; precipitation_probability: (number | null)[]; wind_speed_10m: number[]; uv_index: (number | null)[]; weather_code: number[]; is_day: number[] };

async function forecastAt(lat: number, lon: number): Promise<{ hourly: Hourly; aqi: Map<string, number> }> {
  const key = `askesisWeather.${lat},${lon}`;
  try {
    const kept = JSON.parse(localStorage.getItem(key) ?? 'null') as { at: number; hourly: Hourly; aqi: [string, number][] } | null;
    if (kept && Date.now() - kept.at < 60 * 60_000) return { hourly: kept.hourly, aqi: new Map(kept.aqi) };
  } catch {
    // Asked again below.
  }
  const forecast = (await (
    await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,wind_speed_10m,uv_index,weather_code,is_day&timezone=auto&forecast_days=3`,
      { signal: AbortSignal.timeout(15_000) },
    )
  ).json()) as { hourly: Hourly };
  const aqi = new Map<string, number>();
  try {
    const air = (await (await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=auto&forecast_days=3`, { signal: AbortSignal.timeout(15_000) })).json()) as {
      hourly?: { time: string[]; us_aqi: (number | null)[] };
    };
    air.hourly?.time.forEach((time, index) => {
      const value = air.hourly!.us_aqi[index];
      if (value !== null && value !== undefined) aqi.set(time, value);
    });
  } catch {
    // Air quality is left out when it can't be reached.
  }
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), hourly: forecast.hourly, aqi: [...aqi] }));
  } catch {
    // Not kept this time.
  }
  return { hourly: forecast.hourly, aqi };
}

/** The forecast for one local hour ("2026-10-22T18:00") at the runner's place; `none` when no place is known yet. */
export function useRunWeather(hour: string | undefined): { hour?: RunHour; none: boolean; refresh: () => void } {
  const [state, setState] = useState<{ hour?: RunHour; none: boolean }>({ none: false });
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!hour) return;
    let live = true;
    void (async () => {
      const place = await placeNow();
      if (!place) return live && setState({ none: true });
      const { hourly, aqi } = await forecastAt(place.lat, place.lon);
      const index = hourly.time.indexOf(hour);
      if (index === -1 || !live) return;
      setState({
        none: false,
        hour: {
          temp: hourly.temperature_2m[index],
          feels: hourly.apparent_temperature[index],
          humidity: hourly.relative_humidity_2m[index],
          rain: hourly.precipitation_probability[index] ?? undefined,
          wind: hourly.wind_speed_10m[index],
          uv: hourly.uv_index[index] ?? undefined,
          code: hourly.weather_code[index],
          day: hourly.is_day[index] === 1,
          aqi: aqi.get(hour),
        },
      });
    })().catch(() => undefined);
    return () => {
      live = false;
    };
  }, [hour, round]);
  return { ...state, refresh: () => setRound((count) => count + 1) };
}
