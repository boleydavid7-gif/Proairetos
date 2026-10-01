import { useMemo } from 'react';
import { scheduleService } from '../services';
import { dayRange, personalDate } from '../../core/rhythm/personalDay';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { loadDaySettings } from '../../data/storage/preferences';
import { useServiceData } from './useServiceData';

/**
 * Today as the person lives it: a night shift and the wind-down after it
 * stay in the day they began. Work hours come from their schedule; dates
 * far from now fall back to the calendar.
 */
export function usePersonalDay(now: Date) {
  const calendar = toLocalDate(now);
  const settings = loadDaySettings();
  const blocks =
    useServiceData(
      scheduleService.subscribe,
      () => scheduleService.occurrencesBetween(atTime(addDays(calendar, -3), '00:00'), atTime(addDays(calendar, 15), '00:00')),
      [calendar],
    ) ?? [];

  return useMemo(() => {
    const today = personalDate(now, blocks, settings);
    return { today, rangeOf: (date: string) => dayRange(date, blocks, settings) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, blocks, settings.startHour, settings.followShifts]);
}
