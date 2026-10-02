import type { TagColor } from '../look/tagColors';
import { mondayOnOrBefore } from '../scheduling/dates';
import type { SchedulePattern, ScheduleSegment } from '../scheduling/types';

/** Weekdays as the app counts them for weekly schedules: 0 is Monday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeeklyTime = { days: Weekday[]; start: string; end: string };

/**
 * Time set aside for a goal: a weekly protected-time schedule, made from a
 * few chosen days and one stretch of hours. It is protected time like any
 * other: reminders wait during it and open time treats it as taken. Nothing
 * checks whether it was used.
 */
export function goalSchedule(goal: { body: string; color?: TagColor }, time: WeeklyTime, today: string) {
  const segments: ScheduleSegment[] = Array.from({ length: 7 }, (_, day) => ({
    days: 1,
    blocks: time.days.includes(day as Weekday) ? [{ start: time.start, end: time.end }] : [],
  }));
  return {
    name: goal.body.slice(0, 80),
    kind: 'PROTECTED' as const,
    layout: 'WEEKLY' as const,
    anchorDate: mondayOnOrBefore(today),
    segments,
    color: goal.color ?? ('sage' as const),
  };
}

/** The days and hours of a goal's weekly time, when it has one stretch on each chosen day. */
export function readWeekly(pattern: SchedulePattern): WeeklyTime | undefined {
  if (pattern.layout !== 'WEEKLY' || pattern.segments.length !== 7) return undefined;
  const days: Weekday[] = [];
  let hours: { start: string; end: string } | undefined;
  for (const [index, segment] of pattern.segments.entries()) {
    if (segment.blocks.length === 0) continue;
    if (segment.blocks.length > 1) return undefined;
    const block = segment.blocks[0];
    if (hours && (hours.start !== block.start || hours.end !== block.end)) return undefined;
    hours = { start: block.start, end: block.end };
    days.push(index as Weekday);
  }
  return hours ? { days, ...hours } : undefined;
}
