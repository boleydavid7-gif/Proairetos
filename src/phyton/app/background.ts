import { weatherSettings } from '../../app/weather/weather';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { frostTonight } from '../core/outdoors';
import { forecastNow, rainPlace } from './rain';
import { allPlants, myName, settings } from './state';

/*
 * Frost tonight, checked in the background on Android (Periodic Background Sync, Chrome with Phyton installed):
 * the browser wakes Phyton's worker now and then, which asks Open-Meteo for tomorrow morning's low at the place set
 * here and says "Frost tonight" naming the plants outside. The worker cannot read this page's storage, so the
 * page leaves it what it needs (place, names, unit) in Cache Storage. Nights the page already knows have frost are
 * left out, so the same frost is never said twice. Nothing happens where the browser does not offer it.
 */

const CACHE = 'proairetos-phyton-outside';
const KEY = '/phyton-outside.json';
const TAG = 'phyton-weather';

type Registration = ServiceWorkerRegistration & { periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> } };

export async function shareOutsideWithWorker(): Promise<void> {
  if (typeof caches === 'undefined' || !('serviceWorker' in navigator)) return;
  const current = settings.load();
  const place = rainPlace();
  const me = myName(current);
  const outside = allPlants().filter((plant) => plant.outside && (!current.notices.onlyMine || !plant.who || plant.who === me));
  const on = Boolean(current.rain && current.notices.on && place && outside.length);
  const today = toLocalDate(new Date());
  const forecast = forecastNow();
  const known = [today, addDays(today, 1)].filter((day) => frostTonight(outside, forecast, day));
  const cache = await caches.open(CACHE);
  await cache.put(
    KEY,
    new Response(
      JSON.stringify({
        on,
        lat: place?.lat,
        lon: place?.lon,
        names: outside.map((plant) => plant.name).sort((a, b) => a.localeCompare(b)),
        unit: weatherSettings().unit,
        known,
        away: current.away,
      }),
      { headers: { 'content-type': 'application/json' } },
    ),
  );
  if (!on) return;
  try {
    const status = await navigator.permissions?.query({ name: 'periodic-background-sync' as PermissionName });
    if (status && status.state !== 'granted') return;
    const registration = (await navigator.serviceWorker.getRegistration('/phyton/')) as Registration | undefined;
    await registration?.periodicSync?.register(TAG, { minInterval: 6 * 60 * 60_000 });
  } catch {
    // Not offered here (iPhone, desktop, or not installed).
  }
}
