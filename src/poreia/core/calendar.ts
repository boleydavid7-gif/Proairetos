import type { CalendarEvent } from '../../core/calendar/ics';
import type { LeaveRequest, PtoAccount, VacationPlan } from './pto';
import { addDays, dateText } from './pto';
import type { Booking, ItineraryItem, Trip } from './trips';

function localDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function localDate(date: Date): string {
  return dateText(date);
}

function rangeOverlaps(from: string, until: string, start: string, end: string): boolean {
  return start < until && end > from;
}

function pushAllDay(events: CalendarEvent[], event: Omit<CalendarEvent, 'date' | 'dateEnd' | 'start' | 'end'>, start: string, end: string, from: string, until: string): void {
  if (!rangeOverlaps(from, until, start, end)) return;
  events.push({ ...event, date: start, dateEnd: end });
}

function pushTimed(events: CalendarEvent[], event: Omit<CalendarEvent, 'date' | 'dateEnd'>, start: Date, end: Date, from: Date, until: Date): void {
  if (start >= until || end <= from) return;
  events.push({ ...event, start, end });
}

/** Converts Poreia's dated records into the same calendar events used by the family feed and Days ahead. */
export function poreiaCalendarEvents(
  trips: readonly Trip[],
  bookings: readonly Booking[],
  items: readonly ItineraryItem[],
  requests: readonly LeaveRequest[],
  accounts: readonly PtoAccount[],
  from: Date,
  until: Date,
  vacations: readonly VacationPlan[] = [],
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const fromDate = localDate(from);
  const untilDate = localDate(until);
  const activeTrips = trips.filter((trip) => trip.status !== 'canceled');
  const tripById = new Map(activeTrips.map((trip) => [trip.id, trip]));
  const activeVacations = vacations.filter((vacation) => vacation.status !== 'canceled');
  const linkedTripIds = new Set(activeVacations.flatMap((vacation) => vacation.tripId ? [vacation.tripId] : []));

  for (const trip of activeTrips) {
    if (linkedTripIds.has(trip.id)) continue;
    const start = trip.startDate ?? trip.endDate;
    const end = trip.endDate ?? trip.startDate;
    if (!start || !end) continue;
    pushAllDay(events, { uid: `poreia-trip-${trip.id}`, title: `Vacation · ${trip.name}`, location: trip.destination, notes: 'Poreia trip' }, start, addDays(end, 1), fromDate, untilDate);
  }

  for (const vacation of activeVacations) {
    const trip = vacation.tripId ? tripById.get(vacation.tripId) : undefined;
    pushAllDay(events, { uid: `poreia-vacation-${vacation.id}`, title: `Vacation · ${vacation.name}`, location: trip?.destination, notes: `Poreia vacation · ${vacation.status}` }, vacation.startDate, addDays(vacation.endDate, 1), fromDate, untilDate);
  }

  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const vacationLeaveIds = new Set(activeVacations.flatMap((vacation) => vacation.leaveRequestId ? [vacation.leaveRequestId] : []));
  for (const request of requests) {
    if (request.status === 'denied' || request.status === 'canceled') continue;
    if (vacationLeaveIds.has(request.id) || request.vacationId) continue;
    const account = accountsById.get(request.accountId);
    pushAllDay(events, { uid: `poreia-leave-${request.id}`, title: `PTO · ${account?.name ?? 'Leave'}`, notes: `Poreia leave · ${request.status}` }, request.startDate, addDays(request.endDate, 1), fromDate, untilDate);
  }

  for (const booking of bookings) {
    if (booking.status === 'canceled' || booking.status === 'refunded' || !booking.startDate) continue;
    const trip = tripById.get(booking.tripId);
    const title = `Trip · ${trip?.name ?? 'Travel'}: ${booking.provider}`;
    const event = { uid: `poreia-booking-${booking.id}`, title, location: booking.address, notes: [booking.confirmationNumber, booking.status].filter(Boolean).join(' · ') };
    if (booking.startTime && booking.endTime) {
      const start = localDateTime(booking.startDate, booking.startTime);
      const endDate = booking.endDate ?? booking.startDate;
      let end = localDateTime(endDate, booking.endTime);
      if (end <= start) end = new Date(end.getTime() + 86_400_000);
      pushTimed(events, event, start, end, from, until);
    } else {
      pushAllDay(events, event, booking.startDate, addDays(booking.endDate ?? booking.startDate, 1), fromDate, untilDate);
    }
  }

  for (const item of items) {
    if (item.status === 'canceled' || !item.date) continue;
    const trip = tripById.get(item.tripId);
    const event = { uid: `poreia-itinerary-${item.id}`, title: `Trip · ${trip?.name ?? 'Travel'}: ${item.title}`, location: item.address ?? item.location, notes: item.note ?? item.description };
    if (item.startTime) {
      const start = localDateTime(item.date, item.startTime);
      let end = item.endTime ? localDateTime(item.date, item.endTime) : new Date(start.getTime() + 30 * 60_000);
      if (end <= start) end = new Date(end.getTime() + 86_400_000);
      pushTimed(events, event, start, end, from, until);
    } else {
      pushAllDay(events, event, item.date, addDays(item.date, 1), fromDate, untilDate);
    }
  }
  return events.sort((a, b) => (a.start ?? new Date(`${a.date}T00:00:00`)).getTime() - (b.start ?? new Date(`${b.date}T00:00:00`)).getTime());
}
