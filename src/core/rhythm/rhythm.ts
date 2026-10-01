import type { LifeItem } from '../life-items/types';
import { daysBetween, toLocalDate } from '../scheduling/dates';
import type { ScheduleOccurrence, SchedulePattern } from '../scheduling/types';

/** Whole calendar days since the last visit. */
export function daysAway(lastVisit: Date | null, now: Date): number {
  if (!lastVisit) return 0;
  return Math.max(0, daysBetween(toLocalDate(lastVisit), toLocalDate(now)));
}

/** Away long enough that a gentle welcome helps. */
export const RETURN_AFTER_DAYS = 3;

/**
 * Waiting items whose chosen check-back day has come. The person set the
 * date; this only brings the item back into view.
 */
export function readyToCheckBack(items: LifeItem[], now: Date): LifeItem[] {
  const today = toLocalDate(now);
  return items
    .filter((item) => item.status === 'WAITING' && item.checkBackAt && toLocalDate(new Date(item.checkBackAt)) <= today)
    .sort((a, b) => a.checkBackAt!.localeCompare(b.checkBackAt!));
}

/** Open items whose time was on an earlier day. Shown together, never one by one as a pile. */
export function fromEarlierDays(items: LifeItem[], now: Date): LifeItem[] {
  const today = toLocalDate(now);
  return items
    .filter((item) => (item.status === 'OPEN' || item.status === 'WAITING') && item.scheduledAt)
    .filter((item) => toLocalDate(new Date(item.scheduledAt!)) < today)
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
}

export const PAUSE_OFFER_MINUTES = 45;

export function occurrenceKey(occurrence: ScheduleOccurrence): string {
  return `${occurrence.patternId}:${occurrence.start.toISOString()}`;
}

/**
 * A block that just ended, from a pattern where the person asked to be
 * offered a pause. Only within a short window, and never twice.
 */
export function pauseOffer(
  now: Date,
  occurrences: ScheduleOccurrence[],
  patterns: SchedulePattern[],
  dismissed: ReadonlySet<string>,
): ScheduleOccurrence | undefined {
  const wanted = new Set(patterns.filter((pattern) => pattern.pauseWhenEnds).map((pattern) => pattern.id));
  const windowMs = PAUSE_OFFER_MINUTES * 60_000;
  return occurrences
    .filter((o) => wanted.has(o.patternId) && !dismissed.has(occurrenceKey(o)))
    .filter((o) => o.end <= now && now.getTime() - o.end.getTime() <= windowMs)
    .sort((a, b) => b.end.getTime() - a.end.getTime())[0];
}
