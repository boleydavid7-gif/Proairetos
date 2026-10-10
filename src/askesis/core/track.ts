/**
 * Distance from the phone's location while a session runs, and runs brought in from a watch's file. Only the
 * distance is kept: the points themselves (where someone ran) never leave the session or the file.
 */
export type Fix = { lat: number; lon: number; at: number; accuracy?: number };

const EARTH = 6_371_000;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** Metres between two points on the earth (haversine). */
export function between(a: Pick<Fix, 'lat' | 'lon'>, b: Pick<Fix, 'lat' | 'lon'>): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Fixes worse than this are set aside: indoors or under trees a phone can wander tens of metres. */
export const ROUGH_FIX = 35;
/** Faster than this is a jump in the signal, not a runner (about 36 km/h). */
const TOO_FAST = 10;

export type Track = { meters: number; last?: Fix };

/**
 * Adds one fix. A rough fix is ignored; a move shorter than how sure the phone is waits for the next one (so
 * standing still adds nothing); a jump faster than any runner starts afresh from the new point.
 */
export function addFix(track: Track, fix: Fix): Track {
  if ((fix.accuracy ?? 0) > ROUGH_FIX) return track;
  const last = track.last;
  if (!last) return { ...track, last: fix };
  const step = between(last, fix);
  const seconds = Math.max(0.001, (fix.at - last.at) / 1000);
  if (step / seconds > TOO_FAST) return { ...track, last: fix };
  if (step < Math.max(3, (fix.accuracy ?? 0) * 0.5)) return track;
  return { meters: track.meters + step, last: fix };
}

/** After a pause the next fix starts afresh, so the walk back to the start is not counted. */
export const paused = (track: Track): Track => ({ meters: track.meters });

export type ActivityFile = { date: string; startedAt?: string; seconds?: number; meters?: number; activity: 'run' | 'walk' | 'other' };

const attr = (text: string, name: string) => text.match(new RegExp(`${name}="([^"]+)"`))?.[1];
const tag = (text: string, name: string) => text.match(new RegExp(`<(?:\\w+:)?${name}>([^<]*)</(?:\\w+:)?${name}>`))?.[1];

/** Reads a GPX or TCX file from a watch or another app: when, how long, how far. */
export function readActivityFile(text: string, toLocalDate: (date: Date) => string): ActivityFile | undefined {
  const isTcx = /<TrainingCenterDatabase/i.test(text);
  const sport = isTcx ? attr(text, 'Sport') ?? '' : (tag(text, 'type') ?? '');
  const activity: ActivityFile['activity'] = /run/i.test(sport) ? 'run' : /walk|hik/i.test(sport) ? 'walk' : isTcx || /gpx/i.test(text) ? 'run' : 'other';
  const points: Fix[] = [];
  const pointPattern = isTcx ? /<Trackpoint>([\s\S]*?)<\/Trackpoint>/g : /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
  for (const match of text.matchAll(pointPattern)) {
    const body = isTcx ? match[1] : match[2];
    const lat = Number(isTcx ? tag(body, 'LatitudeDegrees') : attr(match[1], 'lat'));
    const lon = Number(isTcx ? tag(body, 'LongitudeDegrees') : attr(match[1], 'lon'));
    const at = Date.parse(tag(body, 'Time') ?? tag(body, 'time') ?? '');
    if (Number.isFinite(at)) points.push({ lat, lon, at });
  }
  const times = points.map((point) => point.at).filter(Number.isFinite);
  const first = times.length ? Math.min(...times) : Date.parse(tag(text, 'Id') ?? attr(text, 'StartTime') ?? '');
  if (!Number.isFinite(first)) return undefined;
  let seconds: number | undefined;
  let meters: number | undefined;
  if (isTcx) {
    const laps = [...text.matchAll(/<Lap\b[\s\S]*?<\/Lap>/g)].map((lap) => lap[0]);
    const sum = (name: string) => laps.reduce((total, lap) => total + (Number(tag(lap.replace(/<Track>[\s\S]*<\/Track>/, ''), name)) || 0), 0);
    seconds = sum('TotalTimeSeconds') || undefined;
    meters = sum('DistanceMeters') || undefined;
  }
  if (seconds === undefined && times.length > 1) seconds = Math.round((Math.max(...times) - first) / 1000);
  if (meters === undefined) {
    const located = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
    let total = 0;
    for (let index = 1; index < located.length; index += 1) total += between(located[index - 1], located[index]);
    meters = total > 0 ? Math.round(total) : undefined;
  }
  return { date: toLocalDate(new Date(first)), startedAt: new Date(first).toISOString(), seconds, meters: meters && Math.round(meters), activity };
}
