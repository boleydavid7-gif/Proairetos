import { isAdded, subscribeAdded } from '../family/added';
import { openDatabase, requestToPromise, stores } from '../../data/storage/indexeddb/database';
import { subscribe as subscribeChanges } from '../../poreia/data/changes';
import { poreiaCalendarEvents } from '../../poreia/core/calendar';
import type { LeaveRequest, PtoAccount, VacationPlan } from '../../poreia/core/pto';
import type { Booking, ItineraryItem, Trip } from '../../poreia/core/trips';
import type { CalendarEvent as FeedCalendarEvent } from '../../core/calendar/ics';
import type { CalendarEvent as DisplayCalendarEvent } from './otherCalendars';

let database: Promise<IDBDatabase | undefined> | undefined;

function db(): Promise<IDBDatabase | undefined> {
  database ??= openDatabase().catch(() => undefined);
  return database;
}

async function read<T>(store: string): Promise<T[]> {
  const handle = await db();
  if (!handle || !handle.objectStoreNames.contains(store)) return [];
  return requestToPromise(handle.transaction(store, 'readonly').objectStore(store).getAll() as IDBRequest<T[]>);
}

function displayEvents(events: FeedCalendarEvent[]): DisplayCalendarEvent[] {
  return events.map((event) => {
    if (event.date) {
      const until = event.dateEnd ?? nextDate(event.date);
      const start = new Date(`${event.date}T00:00:00`);
      const endDate = new Date(`${until}T00:00:00`);
      return {
        key: event.uid,
        title: event.title,
        start,
        end: endDate > start ? endDate : new Date(start.getTime() + 86_400_000),
        allDay: { from: event.date, until },
        ...(event.location ? { location: event.location } : {}),
        source: 'Poreia',
        sourceId: 'poreia',
      };
    }
    return {
      key: event.uid,
      title: event.title,
      start: event.start!,
      end: event.end!,
      ...(event.location ? { location: event.location } : {}),
      source: 'Poreia',
      sourceId: 'poreia',
    };
  });
}

function nextDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const next = new Date(year, month - 1, day + 1, 12);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

/** Read-only view of Poreia records for Proairetos's internal and published calendars. */
export const poreiaCalendar = {
  subscribe(listener: () => void): () => void {
    const offChanges = subscribeChanges(listener);
    const offAdded = typeof window === 'undefined' ? () => undefined : subscribeAdded(listener);
    return () => { offChanges(); offAdded(); };
  },

  async records() {
    const [trips, bookings, items, requests, accounts, vacations] = await Promise.all([
      read<Trip>(stores.poreiaTrips),
      read<Booking>(stores.poreiaBookings),
      read<ItineraryItem>(stores.poreiaItineraryItems),
      read<LeaveRequest>(stores.poreiaLeaveRequests),
      read<PtoAccount>(stores.poreiaPtoAccounts),
      read<VacationPlan>(stores.poreiaVacations),
    ]);
    return { trips, bookings, items, requests, accounts, vacations };
  },

  async eventsBetween(from: Date, until: Date): Promise<DisplayCalendarEvent[]> {
    if (!isAdded('poreia')) return [];
    const records = await this.records();
    return displayEvents(poreiaCalendarEvents(records.trips, records.bookings, records.items, records.requests, records.accounts, from, until, records.vacations));
  },

  async feedEvents(from: Date, until: Date): Promise<FeedCalendarEvent[]> {
    if (!isAdded('poreia')) return [];
    const records = await this.records();
    return poreiaCalendarEvents(records.trips, records.bookings, records.items, records.requests, records.accounts, from, until, records.vacations).map((event) => event.date && !event.dateEnd ? { ...event, dateEnd: nextDate(event.date) } : event);
  },
};
