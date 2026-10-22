import { useEffect, useMemo, useState } from 'react';
import { scheduleBetween } from '../../askesis/data/proairetosSchedule';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { workDates } from '../../core/scheduling/workDays';
import { onRemoteChanges } from '../../app/sync/syncController';
import type { DaysOff } from '../core/chores';
import { myName, settings } from './state';

/** Work days from the Proairetos schedule on this device, a month back to two months ahead. */
async function readWorkDates(): Promise<Set<string>> {
  const today = toLocalDate(new Date());
  return workDates(await scheduleBetween(atTime(addDays(today, -31), '00:00'), atTime(addDays(today, 62), '00:00')));
}

const asDaysOff = (dates: Set<string>, me: string): DaysOff => ({ isWork: (date) => dates.has(date), me: me || undefined });

/** Days off for notices, read once. */
export async function daysOffNow(): Promise<DaysOff | undefined> {
  const current = settings.load();
  return current.daysOff ? asDaysOff(await readWorkDates(), myName(current)) : undefined;
}

/** Days off for Ergon's pages, when the person chose it; undefined otherwise or until the schedule is read. */
export function useDaysOff(): DaysOff | undefined {
  const current = settings.use();
  const on = Boolean(current.daysOff);
  const me = myName(current);
  const [dates, setDates] = useState<Set<string>>();
  useEffect(() => {
    if (!on) return;
    let live = true;
    const load = () => void readWorkDates().then((next) => live && setDates(next)).catch(() => undefined);
    load();
    const off = onRemoteChanges(load);
    return () => {
      live = false;
      off();
    };
  }, [on]);
  return useMemo(() => (on && dates ? asDaysOff(dates, me) : undefined), [on, dates, me]);
}
