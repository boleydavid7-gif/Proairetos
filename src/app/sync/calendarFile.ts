import { feedEvents, type FeedOptions } from '../../core/calendar/feedEvents';
import { buildIcs } from '../../core/calendar/ics';
import { lifeService, scheduleService } from '../services';
import { addDays, localDate } from '../../oikonomia/core/bills';
import { billCalendarEvents } from '../../oikonomia/core/calendar';
import { poreiaCalendar } from '../calendars/poreiaCalendar';

/** A week back and two months ahead: enough for a calendar, small enough to publish often. */
const DAYS_BACK = 7;
const DAYS_AHEAD = 60;

export async function buildCalendarFile(options: FeedOptions, now = new Date()): Promise<string> {
  const day = 86_400_000;
  const fromDate = new Date(now.getTime() - DAYS_BACK * day);
  const untilDate = new Date(now.getTime() + DAYS_AHEAD * day);
  const from = localDate(fromDate);
  const until = addDays(from, DAYS_BACK + DAYS_AHEAD);
  const [occurrences, items, bills, poreia] = await Promise.all([
    scheduleService.occurrencesBetween(fromDate, untilDate),
    lifeService.list(),
    import('../../oikonomia/data/store').then(({ listBills }) => listBills()).catch(() => []),
    poreiaCalendar.feedEvents(fromDate, untilDate),
  ]);
  return buildIcs(feedEvents(occurrences, items, options).concat(billCalendarEvents(bills, from, until), poreia), { name: 'Proairetos', now });
}

/** Saves the calendar file to the device: a one-time import, no server involved. */
export async function downloadCalendarFile(options: FeedOptions): Promise<void> {
  const text = await buildCalendarFile(options);
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'proairetos.ics';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
