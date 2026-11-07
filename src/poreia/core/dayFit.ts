import type { DayEntry } from './model';
import { distanceText, metersBetween } from './spots';

/*
 * How a day fits together, as plain facts: how far apart two placed things are (a walk, when it is a short one), and the
 * stretches of a day with nothing set between timed things. Nothing is moved or suggested.
 */

/** Walking pace and the usual detour of streets over a straight line. */
const WALK_METERS_PER_MINUTE = 80;
const DETOUR = 1.3;
const WALKABLE = 3000;

const placeOf = (entry: DayEntry) => (entry.kind === 'plan' && entry.item.lat !== undefined && entry.item.lon !== undefined ? { lat: entry.item.lat, lon: entry.item.lon } : undefined);

/** "About 12 min walk · 900 m", or "4.2 km apart" when too far to call a walk; nothing when either has no place. */
export function between(a: DayEntry, b: DayEntry, unit: 'C' | 'F' = 'C'): string | undefined {
  const from = placeOf(a);
  const to = placeOf(b);
  if (!from || !to) return undefined;
  const meters = metersBetween(from, to);
  if (meters < 60) return undefined;
  const street = meters * DETOUR;
  if (street > WALKABLE) return `${distanceText(meters, unit)} apart`;
  return `About ${Math.max(1, Math.round(street / WALK_METERS_PER_MINUTE))} min walk · ${distanceText(street, unit)}`;
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** When a timed entry is over, if known: a booking's end time on the same day (a tour, a flight's arrival). */
function endOf(entry: DayEntry): string | undefined {
  if (!entry.time) return undefined;
  if (entry.kind === 'booking' && !entry.ends && entry.booking.endTime && (!entry.booking.endDate || entry.booking.endDate === entry.booking.startDate) && entry.booking.endTime > entry.time) return entry.booking.endTime;
  return entry.time;
}

/**
 * The open stretches between one timed entry and the next of at least `minimum` minutes, keyed by the index of the
 * entry they follow.
 */
export function openStretches(entries: readonly DayEntry[], minimum = 120): Map<number, { from: string; to: string }> {
  const out = new Map<number, { from: string; to: string }>();
  for (let index = 0; index < entries.length - 1; index += 1) {
    const from = endOf(entries[index]);
    const to = entries[index + 1].time;
    if (!from || !to) continue;
    if (minutesOf(to) - minutesOf(from) >= minimum) out.set(index, { from, to });
  }
  return out;
}
