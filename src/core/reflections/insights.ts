import type { CaptureKind, LifeItem } from '../life-items/types';
import type { ChosenValue } from '../values/types';
import { isWithin, periodRange, type PeriodRange } from './periods';
import type { InnerWeather, Reflection } from './types';

export type InsightPeriod = 'week' | 'month' | 'all';

export function insightRange(period: InsightPeriod, now: Date): PeriodRange {
  if (period === 'all') return { start: new Date(0), end: new Date(8.64e15) };
  return periodRange(period, now);
}

export type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export function timeOfDay(iso: string): TimeOfDay {
  const hour = new Date(iso).getHours();
  if (hour >= 5 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 17) return 'AFTERNOON';
  if (hour >= 17 && hour < 22) return 'EVENING';
  return 'NIGHT';
}

export type Insights = {
  /** Weather the person picked, in a fixed order, with how many entries had none. */
  weather: { counts: Record<InnerWeather, number>; unmarked: number };
  /** Captures in the period by the kind the person tagged. */
  captured: { counts: Record<CaptureKind, number>; untagged: number };
  /** When reflections were written, by the clock only. */
  writtenAt: Record<TimeOfDay, number>;
  /** Values the person tagged entries with or connected items to. */
  values: { name: string; entries: number; items: number }[];
  reflections: number;
};

/**
 * Counts of what the person recorded. Nothing here reads the text, compares
 * against a goal, or draws a conclusion; the person decides what it means.
 */
export function gatherInsights(range: PeriodRange, items: LifeItem[], reflections: Reflection[], values: ChosenValue[]): Insights {
  const entries = reflections.filter((r) => r.kind !== 'INTENTION' && isWithin(r.createdAt, range));
  // Tasks added straight onto Plan were never captured, so they are left out here.
  const captures = items.filter((item) => item.source !== 'MANUAL' && isWithin(item.createdAt, range));

  const weather: Record<InnerWeather, number> = { CLEAR: 0, PARTLY: 0, CLOUDY: 0, RAIN: 0, STORM: 0 };
  let unmarked = 0;
  for (const entry of entries) {
    if (entry.weather) weather[entry.weather] += 1;
    else unmarked += 1;
  }

  const kinds: Record<CaptureKind, number> = { THOUGHT: 0, EMOTION: 0, CONCERN: 0, IDEA: 0 };
  let untagged = 0;
  for (const item of captures) {
    if (item.captureKind) kinds[item.captureKind] += 1;
    else untagged += 1;
  }

  const writtenAt: Record<TimeOfDay, number> = { MORNING: 0, AFTERNOON: 0, EVENING: 0, NIGHT: 0 };
  for (const entry of entries) writtenAt[timeOfDay(entry.createdAt)] += 1;

  const valueCounts = values
    .map((value) => ({
      name: value.name,
      entries: entries.filter((entry) => entry.valueIds?.includes(value.id)).length,
      items: items.filter((item) => isWithin(item.createdAt, range) && item.valueIds?.includes(value.id)).length,
    }))
    .filter((row) => row.entries + row.items > 0);

  return {
    weather: { counts: weather, unmarked },
    captured: { counts: kinds, untagged },
    writtenAt,
    values: valueCounts,
    reflections: entries.length,
  };
}
