import type { LifeItem } from '../../core/life-items/types';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import type { ScheduleOccurrence, SchedulePattern } from '../../core/scheduling/types';

export type TimelineEntry =
  | { kind: 'shift'; key: string; start: Date; end: Date; occurrence: ScheduleOccurrence }
  | { kind: 'item'; key: string; start: Date; item: LifeItem }
  | { kind: 'off'; key: string; pattern: SchedulePattern };

const isOpen = (item: LifeItem) => item.status === 'OPEN' || item.status === 'WAITING';

/**
 * Everything on one local day, in time order: schedule blocks (including a
 * night shift that started the evening before) and items scheduled that day.
 * Committed patterns with nothing that day appear as a quiet "off" row.
 */
export function buildDayTimeline(
  date: string,
  occurrences: ScheduleOccurrence[],
  items: LifeItem[],
  patterns: SchedulePattern[],
): TimelineEntry[] {
  const dayStart = atTime(date, '00:00');
  const dayEnd = atTime(addDays(date, 1), '00:00');

  const shifts: TimelineEntry[] = occurrences
    .filter((o) => o.start < dayEnd && o.end > dayStart)
    .map((occurrence) => ({
      kind: 'shift',
      key: `${occurrence.patternId}:${occurrence.date}:${occurrence.start.toISOString()}`,
      start: occurrence.start,
      end: occurrence.end,
      occurrence,
    }));

  const scheduled: TimelineEntry[] = items
    .filter((item) => isOpen(item) && !item.checklist && item.scheduledAt && toLocalDate(new Date(item.scheduledAt)) === date)
    .map((item) => ({ kind: 'item', key: item.id, start: new Date(item.scheduledAt!), item }));

  const startingToday = new Set(occurrences.filter((o) => o.date === date).map((o) => o.patternId));
  const off: TimelineEntry[] = patterns
    .filter((pattern) => pattern.kind === 'COMMITTED' && pattern.anchorDate <= date)
    .filter((pattern) => !pattern.endDate || date <= pattern.endDate)
    .filter((pattern) => !startingToday.has(pattern.id))
    .map((pattern) => ({ kind: 'off', key: `off:${pattern.id}`, pattern }));

  const timed = [...shifts, ...scheduled].sort(
    (a, b) => (a as { start: Date }).start.getTime() - (b as { start: Date }).start.getTime(),
  );
  return [...off, ...timed];
}

export type NowStatus = {
  /** A block happening right now, if any. */
  current?: ScheduleOccurrence;
  /** The next thing to start: a block or a scheduled item. */
  next?: { title: string; start: Date; occurrence?: ScheduleOccurrence; item?: LifeItem };
};

/** What is happening now and what starts next. Facts only; nothing is ranked. */
export function nowStatus(now: Date, occurrences: ScheduleOccurrence[], items: LifeItem[]): NowStatus {
  const current = occurrences.find((o) => o.start <= now && o.end > now);

  const upcomingShift = occurrences.filter((o) => o.start > now).sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  const upcomingItem = items
    .filter((item) => isOpen(item) && item.scheduledAt && new Date(item.scheduledAt) > now)
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))[0];

  const candidates = [
    upcomingShift && { title: blockTitle(upcomingShift), start: upcomingShift.start, occurrence: upcomingShift },
    upcomingItem && { title: upcomingItem.title, start: new Date(upcomingItem.scheduledAt!), item: upcomingItem },
  ].filter(Boolean) as NonNullable<NowStatus['next']>[];

  const next = candidates.sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  return { current, next };
}

export function blockTitle(occurrence: ScheduleOccurrence): string {
  return occurrence.label ? `${occurrence.patternName} · ${occurrence.label}` : occurrence.patternName;
}

/** "in 40 min", "in 2 h 10 min", "in 3 days". Rounded up so it never says "in 0 min". */
export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} h ${rest} min` : `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** "Today", "Tomorrow", "Yesterday", or the weekday for nearby dates. */
export function dayTitle(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'long' });
}
