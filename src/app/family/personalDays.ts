import { useEffect, useMemo, useState } from 'react';
import { scheduleBetween } from '../../askesis/data/proairetosSchedule';
import { loadDaySettings } from '../../data/storage/preferences';
import { personalDate } from '../../core/rhythm/personalDay';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { addDays, atTime } from '../../core/scheduling/dates';
import { onRemoteChanges } from '../sync/syncController';

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
    return { blocks, dayAt };
  }, [blocks]);
}
