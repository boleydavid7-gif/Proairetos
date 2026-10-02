import { addDays, atTime, mondayOnOrBefore, parseLocalDate } from '../../core/scheduling/dates';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import type { LogEntry } from './log';
import type { PlanWeek } from './plans';
import type { Workout } from './workouts';

/**
 * Laying a plan week over the calendar week. The person chose which
 * weekdays they run; a session can be moved to another day. Sessions not
 * done simply pass with the week: nothing carries over or waits.
 */
export type DayPlan = { workout: Workout; date: string; done?: LogEntry; moved: boolean; note?: string };

export function weekDates(today: string): string[] {
  const monday = mondayOnOrBefore(today);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function layOut(
  week: PlanWeek,
  today: string,
  weekdays: readonly number[],
  moves: Readonly<Record<string, string>>,
  entries: readonly LogEntry[],
  nights: readonly ScheduleOccurrence[] = [],
): DayPlan[] {
  const dates = weekDates(today);
  const days = [...weekdays].sort((a, b) => a - b);
  return week.workouts
    .map((workout, i) => {
      const planned = dates[days[i] ?? Math.min(6, i * 2)];
      const date = moves[workout.id] && dates.includes(moves[workout.id]) ? moves[workout.id] : planned;
      const done = entries.find((entry) => entry.workoutId === workout.id);
      return { workout, date: done?.date ?? date, done, moved: date !== planned, note: nightNote(date, nights) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** "Follows a night in your schedule" when a work block runs overnight into this date. */
export function nightNote(date: string, occurrences: readonly ScheduleOccurrence[]): string | undefined {
  const dayStart = parseLocalDate(date);
  const noon = atTime(date, '12:00');
  const night = occurrences.find(
    (occurrence) =>
      occurrence.kind === 'COMMITTED' && occurrence.start < dayStart && occurrence.end > dayStart && occurrence.end <= noon,
  );
  return night ? 'Follows a night in your schedule' : undefined;
}

/** A day this week, other than today's planned one, with nothing planned and no night before it. */
export function freeDaysThisWeek(
  plans: readonly DayPlan[],
  today: string,
  occurrences: readonly ScheduleOccurrence[],
): string[] {
  const taken = new Set(plans.map((plan) => plan.date));
  return weekDates(today).filter((date) => date >= today && !taken.has(date) && !nightNote(date, occurrences));
}
