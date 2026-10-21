import type { CalendarEvent } from '../../core/calendar/ics';
import { addDays, atTime } from '../../core/scheduling/dates';
import { kindLabel, type Booking, type Trip } from './model';
import type { TimeOff } from './timeOff';

/*
 * What Proairetos shows from Poreia, in the calendar shape its Today, Days ahead and published feed share: each trip
 * as an all-day span, time off (marked "planned" until approved), and timed bookings at their times.
 */

const overlaps = (from: string, until: string, start: string, endExclusive: string) => start < until && endExclusive > from;

export function poreiaEvents(trips: readonly Trip[], offs: readonly TimeOff[], bookings: readonly Booking[], from: Date, until: Date): CalendarEvent[] {
  const fromDay = local(from);
  const untilDay = local(until);
  const events: CalendarEvent[] = [];
  const byTrip = new Map(trips.map((trip) => [trip.id, trip]));

  for (const trip of trips) {
    if (!trip.start) continue;
    const endExclusive = addDays(trip.end && trip.end >= trip.start ? trip.end : trip.start, 1);
    if (!overlaps(fromDay, untilDay, trip.start, endExclusive)) continue;
    events.push({ uid: `poreia-trip-${trip.id}`, title: trip.name, date: trip.start, dateEnd: endExclusive, location: trip.place?.label ?? trip.place?.name });
  }

  for (const off of offs) {
    if (off.status === 'canceled') continue;
    const endExclusive = addDays(off.end, 1);
    if (!overlaps(fromDay, untilDay, off.start, endExclusive)) continue;
    const title = off.status === 'approved' ? 'Time off' : `Time off (${off.status})`;
    events.push({ uid: `poreia-off-${off.id}`, title, date: off.start, dateEnd: endExclusive, notes: off.title });
  }

  for (const booking of bookings) {
    if (!booking.startDate || !byTrip.has(booking.tripId)) continue;
    const where = booking.address ?? (booking.from && booking.to ? `${booking.from} → ${booking.to}` : undefined);
    if (booking.startTime) {
      const start = atTime(booking.startDate, booking.startTime);
      const sameDayEnd = booking.endTime && (!booking.endDate || booking.endDate === booking.startDate);
      let end = sameDayEnd ? atTime(booking.startDate, booking.endTime!) : booking.endDate && booking.endTime && booking.kind !== 'stay' && booking.kind !== 'car' && booking.kind !== 'cruise' ? atTime(booking.endDate, booking.endTime) : new Date(start.getTime() + 60 * 60_000);
      if (end <= start) end = new Date(start.getTime() + 60 * 60_000);
      if (start >= until || end <= from) continue;
      events.push({ uid: `poreia-booking-${booking.id}`, title: `${kindLabel(booking.kind)}: ${booking.title}`, start, end, ...(where ? { location: where } : {}), ...(booking.confirmation ? { notes: `Confirmation ${booking.confirmation}` } : {}) });
    }
  }
  return events;
}

function local(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
