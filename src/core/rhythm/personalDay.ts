import { addDays, atTime, toLocalDate } from '../scheduling/dates';
import type { ScheduleOccurrence } from '../scheduling/types';

/**
 * When the person's day turns over. Rotating shifts mean midnight is often
 * the middle of work: a night shift, or the wind-down after a late one.
 */
export type DaySettings = {
  /** Hour (0-5) a new day starts when nothing is scheduled across it. */
  startHour: number;
  /** Let a work block that runs past the turnover carry the day with it. */
  followShifts: boolean;
};

export const defaultDaySettings: DaySettings = { startHour: 0, followShifts: true };

/** Time after work that still belongs to the day the work began: getting home, winding down. */
export const AFTER_WORK_HOURS = 3;

const hour = (n: number) => `${String(n).padStart(2, '0')}:00`;

/**
 * The moment `date` begins. Normally `startHour` on that date; when a work
 * block that started on an earlier date is still running then (or ended
 * less than AFTER_WORK_HOURS before), the day begins that long after it ends.
 */
export function dayStart(date: string, blocks: readonly ScheduleOccurrence[], settings: DaySettings): Date {
  let start = atTime(date, hour(settings.startHour));
  if (!settings.followShifts) return start;
  const midnight = atTime(date, '00:00').getTime();
  const grace = AFTER_WORK_HOURS * 3_600_000;
  // A few rounds, in case one block hands over to another.
  for (let round = 0; round < 4; round += 1) {
    const carrying = blocks.find(
      (block) =>
        block.kind === 'COMMITTED' &&
        block.start.getTime() < midnight &&
        block.start.getTime() < start.getTime() &&
        block.end.getTime() + grace > start.getTime(),
    );
    if (!carrying) break;
    start = new Date(carrying.end.getTime() + grace);
  }
  return start;
}

/** The person's current day: the calendar date, unless that day has not begun for them yet. */
export function personalDate(now: Date, blocks: readonly ScheduleOccurrence[], settings: DaySettings): string {
  const calendar = toLocalDate(now);
  return now.getTime() < dayStart(calendar, blocks, settings).getTime() ? addDays(calendar, -1) : calendar;
}

/** From the start of `date` to the start of the next day. */
export function dayRange(date: string, blocks: readonly ScheduleOccurrence[], settings: DaySettings): { start: Date; end: Date } {
  return { start: dayStart(date, blocks, settings), end: dayStart(addDays(date, 1), blocks, settings) };
}

/** How long before the day turns over that closing it is offered, when no work marks the end. */
export const CLOSING_HOURS = 6;

/**
 * When "Close the day" becomes available: the last few hours of the day,
 * or once the day's last work block has ended if that is later (so a night
 * shift is closed after it, not in the middle of it).
 */
export function closingFrom(range: { start: Date; end: Date }, blocks: readonly ScheduleOccurrence[]): Date {
  let from = range.end.getTime() - CLOSING_HOURS * 3_600_000;
  for (const block of blocks) {
    const started = block.start.getTime();
    const ended = block.end.getTime();
    if (block.kind === 'COMMITTED' && started >= range.start.getTime() && started < range.end.getTime() && ended < range.end.getTime()) {
      from = Math.max(from, ended);
    }
  }
  return new Date(Math.max(from, range.start.getTime()));
}
