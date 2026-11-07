import { feedEvents, feedLines, type FeedOptions } from '../../core/calendar/feedEvents';
import { buildIcs } from '../../core/calendar/ics';
import { lifeService, scheduleService } from '../services';

/** A week back and two months ahead: enough for a calendar, small enough to publish often. */
const DAYS_BACK = 7;
const DAYS_AHEAD = 60;

/**
 * The calendar file holds what the person switched on in Settings > Calendar (commitments, protected time, things with a
 * day or time) and nothing else. Bills and trips are not in it: an earlier version added them whatever was chosen, with bill
 * amounts and booking confirmation codes and notes.
 */
export async function buildCalendarFile(options: FeedOptions, now = new Date()): Promise<string> {
  const day = 86_400_000;
  const fromDate = new Date(now.getTime() - DAYS_BACK * day);
  const untilDate = new Date(now.getTime() + DAYS_AHEAD * day);
  const wanted = [...(options.bills ? ['oikonomia' as const] : []), ...(options.trips || options.tripTimes ? ['poreia' as const] : [])];
  const [occurrences, items, lines] = await Promise.all([
    scheduleService.occurrencesBetween(fromDate, untilDate),
    lifeService.list(),
    // Bills, trips and bookings come from the apps' calendar providers, for the apps whose categories are switched on. Loaded
    // only when asked for: the providers pull in sync, which imports this file.
    wanted.length ? import('../providers/calendar').then(({ calendarStore }) => calendarStore.lines({ from: fromDate, until: untilDate }, wanted)) : [],
  ]);
  return buildIcs(feedEvents(occurrences, items, options).concat(feedLines(lines, options)), { name: 'Proairetos', now });
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
