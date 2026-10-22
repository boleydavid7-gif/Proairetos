import type { ScheduleOccurrence } from './types';

/**
 * The days the person works, from their schedule: a committed block of four hours or more belongs to the day it
 * begins (a night shift to the evening it starts), so the morning after a night counts as a day off.
 */
export function workDates(blocks: readonly Pick<ScheduleOccurrence, 'kind' | 'date' | 'start' | 'end'>[]): Set<string> {
  const dates = new Set<string>();
  for (const block of blocks) {
    if (block.kind === 'COMMITTED' && block.end.getTime() - block.start.getTime() >= 4 * 3_600_000) dates.add(block.date);
  }
  return dates;
}
