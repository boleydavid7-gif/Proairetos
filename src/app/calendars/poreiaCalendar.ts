import { isAdded, subscribeAdded } from '../family/added';
import { onRemoteChanges } from '../sync/syncController';
import { poreiaEvents } from '../../poreia/core/calendar';
import type { Booking, PlanItem, Trip } from '../../poreia/core/model';
import type { TimeOff } from '../../poreia/core/timeOff';
import type { CalendarEvent as FeedCalendarEvent } from '../../core/calendar/ics';
import type { CalendarEvent as DisplayCalendarEvent } from './otherCalendars';

/*
 * Poreia in Proairetos, read only: trips, time off, timed bookings and timed plans in Today, Days ahead and the published calendar.
 * Poreia keeps its records in browser storage under `poreia:` (one per key), so this reads them straight from there.
 */

function records<T>(prefix: string): T[] {
  const out: T[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        out.push(JSON.parse(localStorage.getItem(key) ?? '') as T);
      } catch {
        // An unreadable record is passed over.
      }
    }
  } catch {
    // Storage blocked: nothing to show.
  }
  return out;
}

function nextDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const next = new Date(year, month - 1, day + 1, 12);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

function events(from: Date, until: Date): FeedCalendarEvent[] {
  if (!isAdded('poreia')) return [];
  return poreiaEvents(records<Trip>('poreia:trip:'), records<TimeOff>('poreia:off:'), records<Booking>('poreia:booking:'), from, until, records<PlanItem>('poreia:plan:'));
}

function displayEvents(list: FeedCalendarEvent[]): DisplayCalendarEvent[] {
  return list.map((event) => {
    if (event.date) {
      const until = event.dateEnd ?? nextDate(event.date);
      const start = new Date(`${event.date}T00:00:00`);
      const end = new Date(`${until}T00:00:00`);
      return { key: event.uid, title: event.title, start, end: end > start ? end : new Date(start.getTime() + 86_400_000), allDay: { from: event.date, until }, ...(event.location ? { location: event.location } : {}), source: 'Poreia', sourceId: 'poreia' };
    }
    return { key: event.uid, title: event.title, start: event.start!, end: event.end!, ...(event.location ? { location: event.location } : {}), source: 'Poreia', sourceId: 'poreia' };
  });
}

export const poreiaCalendar = {
  subscribe(listener: () => void): () => void {
    const onStorage = (event: StorageEvent) => (event.key === null || event.key.startsWith('poreia:')) && listener();
    window.addEventListener('storage', onStorage);
    const offRemote = onRemoteChanges(listener);
    const offAdded = subscribeAdded(listener);
    return () => {
      window.removeEventListener('storage', onStorage);
      offRemote();
      offAdded();
    };
  },

  async eventsBetween(from: Date, until: Date): Promise<DisplayCalendarEvent[]> {
    return displayEvents(events(from, until));
  },

  async feedEvents(from: Date, until: Date): Promise<FeedCalendarEvent[]> {
    return events(from, until);
  },
};
