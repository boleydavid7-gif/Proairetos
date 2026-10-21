import { addDays, atTime } from '../../core/scheduling/dates';
import { hoursFor, shiftsToReplace, type Replaced, type Shift, type TimeOff, type TimeOffStatus } from '../core/timeOff';
import { nowStamp, setupOrDefault, timeOff } from './state';

/*
 * Poreia and Proairetos, both ways. Poreia reads the work shifts in Proairetos's schedule (COMMITTED patterns) to count
 * the hours a stretch of time off takes. When time off is marked approved, Poreia takes those shifts off the schedule
 * (a one-day change on each pattern) and remembers what each day had, so moving or canceling the time off puts them
 * back. Time off itself shows in Proairetos's Today and Days ahead (see `app/calendars/poreiaCalendar.ts`).
 * Proairetos's services load only when needed, so Poreia's first screen never waits for them.
 */

const services = () => import('../../app/services');

/** Work shifts between two dates, and whether there is a work schedule at all. */
export async function workShifts(start: string, end: string): Promise<{ shifts: Shift[]; hasSchedule: boolean }> {
  try {
    const { scheduleService } = await services();
    const patterns = await scheduleService.patterns();
    if (!patterns.some((pattern) => pattern.kind === 'COMMITTED')) return { shifts: [], hasSchedule: false };
    const occurrences = await scheduleService.occurrencesBetween(atTime(addDays(start, -1), '00:00'), atTime(addDays(end, 1), '23:59'));
    const shifts = occurrences
      .filter((each) => each.kind === 'COMMITTED' && each.date >= start && each.date <= end)
      .map((each) => ({ patternId: each.patternId, date: each.date, hours: Math.round(((each.end.getTime() - each.start.getTime()) / 3_600_000) * 100) / 100 }));
    return { shifts, hasSchedule: true };
  } catch {
    return { shifts: [], hasSchedule: false };
  }
}

/** The hours a stretch takes now, from the shifts in Proairetos (or the usual day when there is no schedule). */
export async function countHours(start: string, end: string): Promise<{ hours: number; hasSchedule: boolean; shifts: Shift[] }> {
  const { shifts, hasSchedule } = await workShifts(start, end);
  return { hours: hoursFor(start, end, shifts, setupOrDefault(), hasSchedule), hasSchedule, shifts };
}

async function replaceShifts(start: string, end: string): Promise<Replaced[]> {
  const { scheduleService } = await services();
  const { shifts } = await workShifts(start, end);
  const replaced: Replaced[] = [];
  for (const { patternId, date } of shiftsToReplace(start, end, shifts)) {
    const before = await scheduleService.dayChange(patternId, date);
    await scheduleService.changeDay(patternId, date, []);
    replaced.push({ patternId, date, previous: before ? before.blocks : null });
  }
  return replaced;
}

async function restoreShifts(replaced: readonly Replaced[]): Promise<void> {
  if (!replaced.length) return;
  const { scheduleService } = await services();
  for (const day of replaced) {
    if (day.previous) await scheduleService.changeDay(day.patternId, day.date, day.previous);
    else await scheduleService.restoreDay(day.patternId, day.date);
  }
}

/**
 * Saves time off and keeps Proairetos's schedule in step: approved time off has its shifts replaced; anything else
 * (planned, requested, canceled) has them back. Hours are counted before shifts are taken away, and kept after.
 */
export async function saveTimeOff(next: TimeOff, before?: TimeOff): Promise<TimeOff> {
  let record = { ...next, updatedAt: nowStamp() };
  const wasReplaced = before?.replaced ?? [];
  const moved = before && (before.start !== record.start || before.end !== record.end);
  if (record.status !== 'approved' || moved) {
    await restoreShifts(wasReplaced);
    record = { ...record, replaced: undefined };
  }
  if (!record.hoursSet && (record.status !== 'approved' || !before || moved || before.status !== 'approved')) {
    const { hours } = await countHours(record.start, record.end);
    record = { ...record, hours };
  }
  if (record.status === 'approved' && (!record.replaced || record.replaced.length === 0)) {
    record = { ...record, replaced: await replaceShifts(record.start, record.end) };
  }
  timeOff.put(record);
  return record;
}

export async function setStatus(off: TimeOff, status: TimeOffStatus): Promise<TimeOff> {
  return saveTimeOff({ ...off, status }, off);
}

/** Removes time off (its shifts come back); the returned function puts both back. */
export async function removeTimeOff(off: TimeOff): Promise<() => Promise<void>> {
  await restoreShifts(off.replaced ?? []);
  timeOff.remove(off.id);
  return async () => {
    await saveTimeOff({ ...off, replaced: undefined });
  };
}

/** Recounts hours for time off still being planned, when the work schedule may have changed. */
export async function recountPlanned(): Promise<void> {
  for (const off of timeOff.list()) {
    if (off.hoursSet || off.status === 'approved' || off.status === 'canceled') continue;
    const { hours } = await countHours(off.start, off.end);
    if (hours !== off.hours) timeOff.put({ ...off, hours, updatedAt: nowStamp() });
  }
}

/** The first day with a work shift after a date, for "Back at work Tue" (within a month). */
export const firstWorkDay = async (after: string): Promise<string | undefined> => {
  const { shifts } = await workShifts(addDays(after, 1), addDays(after, 30));
  return shifts.map((shift) => shift.date).sort()[0];
};
