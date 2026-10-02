import { addDays, atTime, toLocalDate } from '../scheduling/dates';
import type { ScheduleOccurrence } from '../scheduling/types';

/** When reminders wait. Overnight windows (start after end) run past midnight. */
export type QuietHours = { on: boolean; start: string; end: string; duringProtected: boolean };

export const defaultQuietHours: QuietHours = { on: true, start: '22:00', end: '07:00', duringProtected: true };

/** The end of the quiet window containing `at`, if it falls inside one. */
function quietWindowEnd(at: Date, quiet: QuietHours): Date | null {
  if (!quiet.on || quiet.start === quiet.end) return null;
  const day = toLocalDate(at);
  // A window can start today or have started yesterday (overnight).
  for (const startDay of [addDays(day, -1), day]) {
    const start = atTime(startDay, quiet.start);
    const end = atTime(quiet.end > quiet.start ? startDay : addDays(startDay, 1), quiet.end);
    if (at >= start && at < end) return end;
  }
  return null;
}

/**
 * When a reminder due at `at` is delivered: as set, or, if it falls in quiet
 * hours or in protected time, as soon as that ends. Nothing is dropped.
 */
export function deliverAt(at: Date, quiet: QuietHours, blocks: readonly ScheduleOccurrence[]): Date {
  let when = at;
  // A few rounds, in case one quiet stretch runs into another.
  for (let round = 0; round < 4; round += 1) {
    const quietEnd = quietWindowEnd(when, quiet);
    const protectedEnd = quiet.duringProtected
      ? blocks.find((block) => block.kind === 'PROTECTED' && when >= block.start && when < block.end)?.end
      : undefined;
    const later = [quietEnd, protectedEnd].filter((d): d is Date => d instanceof Date).sort((a, b) => b.getTime() - a.getTime())[0];
    if (!later) return when;
    when = later;
  }
  return when;
}
