import { SPOT_CATEGORIES, type SpotCategory } from '../core/spots';
import { placesOf, type Place, type Trip } from '../core/model';
import { countryFacts, forecast, guideFor, guideSpots, nearby } from './world';

/*
 * A trip kept for offline: the guide, the guide's own listings and every kind of place nearby (kept in `poreiaCache.*`
 * like any answer), the forecast and country facts, and the map around the place at the zooms used on foot and in town
 * (tiles, fonts and symbols, kept by Poreia's worker in Cache Storage `poreia-map`). When it was kept is noted on this
 * device only (`poreiaOffline.<trip>`).
 */

const STYLES = ['https://tiles.openfreemap.org/styles/dark', 'https://tiles.openfreemap.org/styles/positron'];
/** Kilometers around the place kept at each zoom: the town wide, the center close. */
const REACH: [zoom: number, km: number][] = [
  [10, 20],
  [11, 15],
  [12, 10],
  [13, 6],
  [14, 4],
  [15, 2.5],
  [16, 1.2],
];
const MOST_TILES = 450;
/** The cache `public/poreia/sw.js` answers the map from. */
const MAP_CACHE = 'poreia-map';

export type KeptNote = { at: string; tiles: number };

const noteKey = (tripId: string) => `poreiaOffline.${tripId}`;

export function keptFor(tripId: string): KeptNote | undefined {
  try {
    return JSON.parse(localStorage.getItem(noteKey(tripId)) ?? 'null') ?? undefined;
  } catch {
    return undefined;
  }
}

/** The tiles covering `km` around a point at a zoom (Web Mercator, as the map draws them). */
export function tilesAround(lat: number, lon: number, zoom: number, km: number): [number, number, number][] {
  const n = 2 ** zoom;
  const x = (longitude: number) => Math.floor(((longitude + 180) / 360) * n);
  const y = (latitude: number) => {
    const rad = (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  };
  const dLat = km / 111;
  const dLon = km / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const tiles: [number, number, number][] = [];
  for (let tx = x(lon - dLon); tx <= x(lon + dLon); tx += 1) {
    for (let ty = y(lat + dLat); ty <= y(lat - dLat); ty += 1) tiles.push([zoom, ((tx % n) + n) % n, ty]);
  }
  return tiles;
}

type Style = { sources?: Record<string, { url?: string; tiles?: string[] }>; sprite?: string | { url: string }[]; glyphs?: string; layers?: { layout?: Record<string, unknown> }[] };

/** Every address the map needs around the place: styles, symbols, fonts and tiles. */
async function mapAddresses(centers: readonly { lat: number; lon: number }[]): Promise<string[]> {
  const addresses = new Set<string>(STYLES);
  const templates = new Set<string>();
  for (const url of STYLES) {
    const style = (await (await fetch(url)).json()) as Style;
    const sprites = typeof style.sprite === 'string' ? [style.sprite] : (style.sprite ?? []).map((each) => each.url);
    for (const sprite of sprites) for (const end of ['.json', '.png', '@2x.json', '@2x.png']) addresses.add(`${sprite}${end}`);
    const fonts = new Set<string>();
    for (const layer of style.layers ?? []) {
      const font = layer.layout?.['text-font'];
      if (Array.isArray(font) && font.every((each) => typeof each === 'string')) fonts.add(font.join(','));
    }
    if (style.glyphs) for (const font of fonts) for (const range of ['0-255', '256-511', '8192-8447']) addresses.add(style.glyphs.replace('{fontstack}', encodeURIComponent(font)).replace('{range}', range));
    for (const source of Object.values(style.sources ?? {})) {
      if (source.tiles) source.tiles.forEach((each) => templates.add(each));
      else if (source.url?.startsWith('https://tiles.openfreemap.org/')) {
        addresses.add(source.url);
        const index = (await (await fetch(source.url)).json()) as { tiles?: string[] };
        index.tiles?.forEach((each) => templates.add(each));
      }
    }
  }
  // Each place gets its share of the tiles, closest zooms first within it.
  const tiles = centers.flatMap(({ lat, lon }) => REACH.flatMap(([zoom, km]) => tilesAround(lat, lon, zoom, km)).slice(0, Math.floor(MOST_TILES / Math.max(1, centers.length)) + 60));
  for (const template of templates) for (const [z, x, y] of tiles) addresses.add(template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)));
  return [...addresses];
}

/** Runs the jobs a few at a time, saying how far it has come. */
async function inTurn(jobs: (() => Promise<unknown>)[], at: number, onStep: () => void): Promise<number> {
  let missed = 0;
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      await job().catch(() => {
        missed += 1;
      });
      onStep();
    }
  };
  await Promise.all(Array.from({ length: at }, worker));
  return missed;
}

export async function keepForOffline(trip: Trip, onProgress: (done: number, total: number) => void): Promise<{ missed: number }> {
  const places = placesOf(trip)
    .map((stop) => stop.place)
    .filter((place): place is Place & { lat: number; lon: number } => place.lat !== undefined && place.lon !== undefined);
  if (!places.length) return { missed: 0 };
  const kinds = SPOT_CATEGORIES.map((each) => each.id).filter((id): id is Exclude<SpotCategory, 'event'> => id !== 'event');
  const data: (() => Promise<unknown>)[] = places.flatMap((place) => [
    () => guideFor(place),
    () => guideSpots(place),
    () => forecast(place.lat, place.lon),
    ...(place.countryCode ? [() => countryFacts(place.countryCode!)] : []),
    ...kinds.map((kind) => () => nearby(kind, place.lat, place.lon)),
  ]);
  let total = data.length + 1;
  let done = 0;
  const step = () => onProgress(++done, total);
  onProgress(0, total);
  const addresses = await mapAddresses(places).catch(() => [] as string[]);
  total += addresses.length - 1;
  onProgress(done, total);
  // The map's files go straight into the cache Poreia's worker reads (so this works before the worker is in charge);
  // the answers keep themselves.
  const cache = 'caches' in window ? await caches.open(MAP_CACHE) : undefined;
  const keep = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    await (cache ? cache.put(url, response) : response.arrayBuffer());
  };
  const missedMap = await inTurn(addresses.map((url) => () => keep(url)), 6, step);
  const missedData = await inTurn(data, 2, step);
  try {
    localStorage.setItem(noteKey(trip.id), JSON.stringify({ at: new Date().toISOString(), tiles: addresses.length - missedMap } satisfies KeptNote));
  } catch {
    // Storage full: the files are kept all the same.
  }
  return { missed: missedMap + missedData };
}
