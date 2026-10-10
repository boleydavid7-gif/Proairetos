import { useEffect, useMemo, useState } from 'react';
import { scheduleBetween } from '../../askesis/data/proairetosSchedule';
import { loadDaySettings } from '../../data/storage/preferences';
import { personalDate } from '../../core/rhythm/personalDay';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { addDays, atTime } from '../../core/scheduling/dates';
import { onRemoteChanges } from '../../app/sync/syncController';
import type { Drink } from '../core/drinks';

/** The clock, a minute at a time and again when the app comes back into view. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 60_000);
    const onShow = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);
  return now;
}

/**
 * The person's days as Proairetos keeps them (read only): the schedule between two dates, so a night shift
 * and the wind-down after it count with the day they began. Without a schedule, days are calendar days.
 */
export function useDays(from: string, until: string) {
  const [blocks, setBlocks] = useState<ScheduleOccurrence[]>([]);
  useEffect(() => {
    let live = true;
    const load = () =>
      void scheduleBetween(atTime(addDays(from, -1), '00:00'), atTime(addDays(until, 2), '00:00'))
        .then((next) => live && setBlocks(next))
        .catch(() => undefined);
    load();
    const off = onRemoteChanges(load);
    return () => {
      live = false;
      off();
    };
  }, [from, until]);
  return useMemo(() => {
    const settings = loadDaySettings();
    const dayAt = (when: Date) => personalDate(when, blocks, settings);
    return { blocks, dayAt, dayOf: (drink: Drink) => dayAt(new Date(drink.loggedAt)) };
  }, [blocks]);
}
