import type { ItemEvent } from '../item-events/types';
import { kindOf, type ItemKind } from '../life-items/kinds';
import type { LifeItem } from '../life-items/types';
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
  captured: { counts: Record<ItemKind, number>; untagged: number };
  /** When reflections were written, by the clock only. */
  writtenAt: Record<TimeOfDay, number>;
  /** When things were marked done, by the clock only. */
  doneAt: Record<TimeOfDay, number>;
  /** Values the person tagged entries with or connected items to, and how many of those items were done in the period. */
  values: { name: string; entries: number; items: number; done: number }[];
  reflections: number;
};

/**
 * Counts of what the person recorded. Nothing here reads the text, compares
 * against a goal, or draws a conclusion; the person decides what it means.
 */
export function gatherInsights(
  range: PeriodRange,
  items: LifeItem[],
  reflections: Reflection[],
  values: ChosenValue[],
  events: readonly ItemEvent[] = [],
): Insights {
  const completed = events.filter((event) => event.kind === 'COMPLETED' && isWithin(event.timestamp, range));
  const doneAt: Record<TimeOfDay, number> = { MORNING: 0, AFTERNOON: 0, EVENING: 0, NIGHT: 0 };
  for (const event of completed) doneAt[timeOfDay(event.timestamp)] += 1;
  const doneIds = new Set(completed.map((event) => event.itemId));

  const entries = reflections.filter((r) => r.kind !== 'INTENTION' && isWithin(r.createdAt, range));
  // Tasks added straight onto Plan were never captured, so they are left out here.
  const captures = items.filter((item) => item.source !== 'MANUAL' && isWithin(item.createdAt, range));

  const weather: Record<InnerWeather, number> = { CLEAR: 0, PARTLY: 0, CLOUDY: 0, RAIN: 0, STORM: 0 };
  let unmarked = 0;
  for (const entry of entries) {
    if (entry.weather) weather[entry.weather] += 1;
    else unmarked += 1;
  }

  const kinds: Record<ItemKind, number> = { TODO: 0, REMEMBER: 0, CONCERN: 0, IDEA: 0, FEELING: 0 };
  let untagged = 0;
  for (const item of captures) {
    const kind = kindOf(item);
    if (kind) kinds[kind] += 1;
    else untagged += 1;
  }

  const writtenAt: Record<TimeOfDay, number> = { MORNING: 0, AFTERNOON: 0, EVENING: 0, NIGHT: 0 };
  for (const entry of entries) writtenAt[timeOfDay(entry.createdAt)] += 1;

  const valueCounts = values
    .map((value) => ({
      name: value.name,
      entries: entries.filter((entry) => entry.valueIds?.includes(value.id)).length,
      items: items.filter((item) => isWithin(item.createdAt, range) && item.valueIds?.includes(value.id)).length,
      done: items.filter((item) => doneIds.has(item.id) && item.valueIds?.includes(value.id)).length,
    }))
    .filter((row) => row.entries + row.items + row.done > 0);

  return {
    weather: { counts: weather, unmarked },
    captured: { counts: kinds, untagged },
    writtenAt,
    doneAt,
    values: valueCounts,
    reflections: entries.length,
  };
}

/** The period just before, the same length: last week, or last month. */
export function previousRange(period: InsightPeriod, now: Date): PeriodRange | undefined {
  if (period === 'all') return undefined;
  const current = periodRange(period, now);
  const dayBefore = new Date(current.start.getFullYear(), current.start.getMonth(), current.start.getDate() - 1, 12);
  return periodRange(period, dayBefore);
}

export type SideBySideRow = { label: string; now: number; before: number };

/**
 * Two periods next to each other, as plain counts. No arrows, no "more" or
 * "less", nothing that says which is better; the person reads it.
 */
export function sideBySide(
  range: PeriodRange,
  before: PeriodRange,
  items: readonly LifeItem[],
  events: readonly ItemEvent[],
  reflections: readonly Reflection[],
): SideBySideRow[] {
  const captured = (r: PeriodRange) => items.filter((item) => item.source !== 'MANUAL' && isWithin(item.createdAt, r)).length;
  const kind = (k: ItemEvent['kind'], r: PeriodRange) =>
    new Set(events.filter((event) => event.kind === k && isWithin(event.timestamp, r)).map((event) => event.itemId)).size;
  const focused = (r: PeriodRange) =>
    events
      .filter((event) => event.kind === 'FOCUSED' && isWithin(event.timestamp, r))
      .reduce((sum, event) => sum + (typeof event.metadata?.minutes === 'number' ? event.metadata.minutes : 0), 0);
  const written = (r: PeriodRange) => reflections.filter((entry) => entry.kind !== 'INTENTION' && isWithin(entry.createdAt, r)).length;
  return [
    { label: 'Captured', now: captured(range), before: captured(before) },
    { label: 'Done', now: kind('COMPLETED', range), before: kind('COMPLETED', before) },
    { label: 'Let go', now: kind('LET_GO', range), before: kind('LET_GO', before) },
    { label: 'Focused minutes', now: focused(range), before: focused(before) },
    { label: 'Reflections', now: written(range), before: written(before) },
  ];
}
