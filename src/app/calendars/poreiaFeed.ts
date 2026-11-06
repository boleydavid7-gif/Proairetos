import { isAdded } from '../family/added';
import { poreiaEvents } from '../../poreia/core/calendar';
import type { Booking, PlanItem, Trip } from '../../poreia/core/model';
import type { TimeOff } from '../../poreia/core/timeOff';
import type { CalendarEvent as FeedCalendarEvent } from '../../core/calendar/ics';

/*
 * Poreia in the published calendar, read only: trips, time off, timed bookings and timed plans. Today and Days ahead read
 * Poreia through its calendar provider (`poreia/providers/calendar.ts`), which leaves out the notes this file carries.
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

function events(from: Date, until: Date): FeedCalendarEvent[] {
  if (!isAdded('poreia')) return [];
  return poreiaEvents(records<Trip>('poreia:trip:'), records<TimeOff>('poreia:off:'), records<Booking>('poreia:booking:'), from, until, records<PlanItem>('poreia:plan:'));
}

/** What the published calendar carries from Poreia (the calendar providers carry less: no notes, no codes). */
export const poreiaFeed = {
  async feedEvents(from: Date, until: Date): Promise<FeedCalendarEvent[]> {
    return events(from, until);
  },
};
