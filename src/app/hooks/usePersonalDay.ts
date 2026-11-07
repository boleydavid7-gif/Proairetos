import { useMemo } from 'react';
import { scheduleService } from '../services';
import { dayRange, personalDate } from '../../core/rhythm/personalDay';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { loadDaySettings } from '../../data/storage/preferences';
import { useServiceData } from './useServiceData';
import { otherCalendars } from '../calendars/otherCalendars';

function subscribeBlocks(listener: () => void) {
  const offSchedule = scheduleService.subscribe(listener);
  const offCalendars = otherCalendars.subscribe(listener);
  return () => {
    offSchedule();
    offCalendars();
  };
}

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
      subscribeBlocks,
      async () => {
        const from = atTime(addDays(calendar, -3), '00:00');
        const until = atTime(addDays(calendar, 15), '00:00');
        // Schedule blocks, plus events from other calendars the person set to count as work or protected time.
        return [...(await scheduleService.occurrencesBetween(from, until)), ...otherCalendars.blocksBetween(from, until)];
      },
      [calendar],
    ) ?? [];

  return useMemo(() => {
    const today = personalDate(now, blocks, settings);
    return { today, blocks, rangeOf: (date: string) => dayRange(date, blocks, settings) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, blocks, settings.startHour, settings.followShifts]);
}
