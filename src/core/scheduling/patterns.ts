import { addDays, atTime, daysBetween, isValidLocalDate, isValidTime, minutesOf, toLocalDate } from './dates';
import {
  MAX_CYCLE_DAYS,
  MAX_SEGMENT_DAYS,
  type ScheduleException,
  type ScheduleOccurrence,
  type SchedulePattern,
  type ScheduleSegment,
  type TimeBlock,
} from './types';

export function cycleLength(segments: ScheduleSegment[]): number {
  return segments.reduce((total, segment) => total + segment.days, 0);
}

/** Problems with a pattern, in plain words. Empty when it is usable. */
export function validatePattern(pattern: Pick<SchedulePattern, 'name' | 'anchorDate' | 'segments' | 'endDate'>): string[] {
  const problems: string[] = [];
  if (!pattern.name.trim()) problems.push('Give the schedule a name.');
  if (!isValidLocalDate(pattern.anchorDate)) problems.push('Choose the date the cycle starts.');
  if (pattern.endDate && (!isValidLocalDate(pattern.endDate) || pattern.endDate < pattern.anchorDate)) {
    problems.push('The end date needs to be on or after the start date.');
  }
  if (pattern.segments.length === 0) problems.push('Add at least one run of days.');

  pattern.segments.forEach((segment, index) => {
    const which = `Run ${index + 1}`;
    if (!Number.isInteger(segment.days) || segment.days < 1 || segment.days > MAX_SEGMENT_DAYS) {
      problems.push(`${which}: choose between 1 and ${MAX_SEGMENT_DAYS} days.`);
    }
    for (const block of segment.blocks) {
      if (!isValidTime(block.start) || !isValidTime(block.end)) problems.push(`${which}: check the times.`);
      else if (block.start === block.end) problems.push(`${which}: start and end are the same time.`);
    }
  });

  if (cycleLength(pattern.segments) > MAX_CYCLE_DAYS) {
    problems.push(`A cycle can be up to ${MAX_CYCLE_DAYS} days.`);
  }
  return problems;
}

/** The blocks a pattern places on a local date, before one-day changes. */
export function blocksOn(pattern: SchedulePattern, date: string): TimeBlock[] {
  if (date < pattern.anchorDate || (pattern.endDate && date > pattern.endDate)) return [];
  const length = cycleLength(pattern.segments);
  if (length === 0) return [];

  let position = daysBetween(pattern.anchorDate, date) % length;
  for (const segment of pattern.segments) {
    if (position < segment.days) return segment.blocks;
    position -= segment.days;
  }
  return [];
}

function toOccurrence(pattern: SchedulePattern, date: string, block: TimeBlock, changed: boolean): ScheduleOccurrence {
  const start = atTime(date, block.start);
  const crossesMidnight = minutesOf(block.end) <= minutesOf(block.start);
  const end = atTime(crossesMidnight ? addDays(date, 1) : date, block.end);
  return {
    patternId: pattern.id,
    patternName: pattern.name,
    kind: pattern.kind,
    label: block.label,
    date,
    start,
    end,
    changed,
  };
}

/** Occurrences that begin on a local date, with that day's change applied if there is one. */
export function occurrencesStartingOn(
  pattern: SchedulePattern,
  date: string,
  exceptions: ScheduleException[] = [],
): ScheduleOccurrence[] {
  if (date < pattern.anchorDate || (pattern.endDate && date > pattern.endDate)) return [];
  const change = exceptions.find((exception) => exception.patternId === pattern.id && exception.date === date);
  const blocks = change ? change.blocks : blocksOn(pattern, date);
  return blocks.map((block) => toOccurrence(pattern, date, block, Boolean(change)));
}

/**
 * Every occurrence overlapping [from, to), in start order. Looks one day
 * back so a night shift that began yesterday still shows this morning.
 */
export function occurrencesBetween(
  patterns: SchedulePattern[],
  exceptions: ScheduleException[],
  from: Date,
  to: Date,
): ScheduleOccurrence[] {
  const results: ScheduleOccurrence[] = [];
  const last = toLocalDate(to);
  for (let date = addDays(toLocalDate(from), -1); date <= last; date = addDays(date, 1)) {
    for (const pattern of patterns) {
      for (const occurrence of occurrencesStartingOn(pattern, date, exceptions)) {
        if (occurrence.start < to && occurrence.end > from) results.push(occurrence);
      }
    }
  }
  return results.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Occurrences overlapping a local day. */
export function occurrencesOnDay(
  patterns: SchedulePattern[],
  exceptions: ScheduleException[],
  date: string,
): ScheduleOccurrence[] {
  return occurrencesBetween(patterns, exceptions, atTime(date, '00:00'), atTime(addDays(date, 1), '00:00'));
}
