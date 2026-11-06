import type { LifeItem } from '../life-items/types';
import type { ScheduleOccurrence } from '../scheduling/types';
import type { CalendarLine } from '../providers/types';
import type { CalendarEvent } from './ics';

/** What the person chose to put in their calendar. Off unless chosen, except commitments. */
export type FeedOptions = {
  /** Committed blocks from the schedule (work, study, care). */
  shifts: boolean;
  /** Title them with their own labels ("Class") instead of a plain "Busy". */
  shiftLabels: boolean;
  /** Protected time blocks, titled "Protected time". */
  protectedTime: boolean;
  /** Dated or timed items, with their titles. */
  tasks: boolean;
  /** Bill names and due dates. Never an amount. */
  bills: boolean;
  /** Trips (name, dates, place name) and time off, as spans of days. */
  trips: boolean;
  /** Bookings and plans that have a time: title and time. Never a code, an address or a note. */
  tripTimes: boolean;
};

export const defaultFeedOptions: FeedOptions = { shifts: true, shiftLabels: false, protectedTime: false, tasks: false, bills: false, trips: false, tripTimes: false };

/** Timed items are shown as half an hour, since an item has a time but no length. */
const ITEM_MINUTES = 30;

export function feedEvents(occurrences: readonly ScheduleOccurrence[], items: readonly LifeItem[], options: FeedOptions): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const occurrence of occurrences) {
    const isWork = occurrence.kind === 'COMMITTED';
    if (isWork ? !options.shifts : !options.protectedTime) continue;
    const title = isWork
      ? options.shiftLabels
        ? occurrence.label || occurrence.patternName || 'Busy'
        : 'Busy'
      : 'Protected time';
    events.push({ uid: `block-${occurrence.patternId}-${occurrence.start.toISOString()}`, title, start: occurrence.start, end: occurrence.end });
  }
  if (options.tasks) {
    for (const item of items) {
      if (item.status !== 'OPEN' && item.status !== 'WAITING') continue;
      if (item.scheduledAt) {
        const start = new Date(item.scheduledAt);
        events.push({ uid: `item-${item.id}`, title: item.title, start, end: item.endsAt && new Date(item.endsAt) > start ? new Date(item.endsAt) : new Date(start.getTime() + ITEM_MINUTES * 60_000) });
      } else if (item.plannedFor) {
        events.push({ uid: `item-${item.id}`, title: item.title, date: item.plannedFor });
      }
    }
  }
  return events;
}

const part = (value: string) => encodeURIComponent(value);

/**
 * The events the calendar providers' lines make, for the categories the person switched on and no others. A line cannot
 * carry an amount, a code or a note (the manifest classifies what each app's lines may state), and nothing is added here:
 * no description, and no place except a trip's own place name.
 */
export function feedLines(lines: readonly CalendarLine[], options: Pick<FeedOptions, 'bills' | 'trips' | 'tripTimes'>): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const line of lines) {
    const uid = `${line.ref.app}-${line.ref.kind}-${part(line.ref.id)}-${line.day}`;
    if (line.ref.app === 'oikonomia' && options.bills) {
      events.push({ uid, title: line.title, date: line.day });
    } else if (line.ref.app === 'poreia' && options.trips && line.kind === 'info' && line.until) {
      events.push({ uid, title: line.title, date: line.day, dateEnd: line.until, ...(line.ref.kind === 'trip' && line.location ? { location: line.location } : {}) });
    } else if (line.ref.app === 'poreia' && options.tripTimes && line.kind === 'event' && line.start && line.end) {
      events.push({ uid, title: line.title, start: line.start, end: line.end });
    }
  }
  return events;
}

/** What the file holds for the switches that are on, in the words the settings page uses. Empty when nothing is on. */
export function describeFeed(options: FeedOptions): string[] {
  const parts: string[] = [];
  if (options.shifts) parts.push(options.shiftLabels ? 'your commitments, with the names from your schedule' : 'your commitments, titled “Busy”');
  if (options.protectedTime) parts.push('protected time, titled “Protected time”');
  if (options.tasks) parts.push('the titles and times of to-dos that have a day or time');
  if (options.bills) parts.push('bill names and due dates');
  if (options.trips) parts.push('trip names, dates and place names, and days of time off');
  if (options.tripTimes) parts.push('the titles and times of bookings and plans that have a time');
  return parts;
}

/** The line about what a calendar file never holds, whatever is switched on. */
export const FEED_NEVER = 'It never holds bill amounts, confirmation codes, addresses, routes or notes.';
