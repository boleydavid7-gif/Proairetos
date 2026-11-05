import { openStretches, type Span } from '../../core/rhythm/openTime';
import { addDays, atTime } from '../../core/scheduling/dates';
import { loadQuietHours } from '../../data/storage/preferences';
import { sessionEnd, type StudySession } from '../core/subjects';

/** The part of the day the week offers (the person's own sleep and quiet hours already take what they hold). */
const DAY_FROM = '06:00';
const DAY_UNTIL = '22:00';

/**
 * The open stretches on each of `days`: what is left after work and protected time, other calendars, timed things in
 * Proairetos, sleep and sittings already set here. Read from the same schedule the training offers use; it is loaded
 * only when a week is shown.
 */
export async function openByDay(days: readonly string[], placed: readonly StudySession[], now = new Date()): Promise<Map<string, Span[]>> {
  const [{ busyOn }, { lifeService }] = await Promise.all([import('../../app/family/busyTime'), import('../../app/services')]);
  const items = await lifeService.list();
  const mine = placed.map((session) => ({ start: new Date(session.start), end: sessionEnd(session) }));
  const out = new Map<string, Span[]>();
  await Promise.all(
    days.map(async (day) => {
      const range = { start: atTime(day, DAY_FROM), end: atTime(day, DAY_UNTIL) };
      const busy = [...(await busyOn(day, items)), ...mine];
      out.set(day, openStretches(range, now, busy, loadQuietHours()));
    }),
  );
  return out;
}

export const nextDays = (from: string, count: number) => Array.from({ length: count }, (_, index) => addDays(from, index));
