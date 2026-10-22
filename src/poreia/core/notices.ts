import type { Notice } from '../../core/notify/notices';
import { addDays, atTime } from '../../core/scheduling/dates';
import { daysOf, entryTitle, type Booking, type PackItem, type PlanItem, type Trip } from './model';

/*
 * Poreia's reminders, written on the device like every other app's: travel a chosen time before it leaves, a flight's
 * check-in a day ahead, check-in and check-out at a stay, a car's pick-up and return, timed tickets and the person's own
 * timed plans, and an evening line the day before a trip with its first thing and what is left to pack. Times are the
 * phone's local time, which is the place's own time once the phone has moved there.
 */

export type TripNoticeChoices = {
  on: boolean;
  /** Minutes before a flight, train, bus or cruise leaves. */
  travelLead: number;
  /** A flight's check-in, 24 hours before it leaves. */
  checkIn: boolean;
  /** Minutes before a stay, car, ticket or plan with a time. */
  otherLead: number;
  /** The evening before a trip starts. */
  dayBefore: boolean;
};

export const defaultTripNotices: TripNoticeChoices = { on: true, travelLead: 180, checkIn: true, otherLead: 60, dayBefore: true };

const TRAVEL = new Set<Booking['kind']>(['flight', 'train', 'bus', 'cruise']);
const MORNING = '09:00';
const EVENING = '18:00';

const clock = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};
const less = (at: Date, minutes: number) => new Date(at.getTime() - minutes * 60_000);
const words = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ');

export function tripNotices(
  trips: readonly Trip[],
  bookings: readonly Booking[],
  plans: readonly PlanItem[],
  packing: readonly PackItem[],
  choices: TripNoticeChoices,
  now: Date,
  until: Date,
): Notice[] {
  if (!choices.on) return [];
  const notices: Notice[] = [];
  const add = (notice: Notice) => {
    if (notice.at >= now && notice.at <= until) notices.push(notice);
  };

  for (const booking of bookings) {
    if (!trips.some((trip) => trip.id === booking.tripId)) continue;
    const open = `poreia:booked:${booking.id}`;
    const code = booking.confirmation ? `Confirmation ${booking.confirmation}` : undefined;
    if (booking.startDate && booking.startTime) {
      const leaves = atTime(booking.startDate, booking.startTime);
      if (TRAVEL.has(booking.kind)) {
        add({ key: `poreia:leave:${booking.id}:${booking.startDate}T${booking.startTime}`, kind: 'trip', at: less(leaves, choices.travelLead), title: booking.title, body: words(`Leaves ${clock(booking.startTime)}`, booking.from && `from ${booking.from}`, code), open });
        if (booking.kind === 'flight' && choices.checkIn) {
          add({ key: `poreia:checkin:${booking.id}:${booking.startDate}T${booking.startTime}`, kind: 'trip', at: less(leaves, 24 * 60), title: booking.title, body: words('Check-in usually opens now', code), open });
        }
      } else {
        const what = booking.kind === 'stay' ? `Check-in from ${clock(booking.startTime)}` : booking.kind === 'car' ? `Pick-up at ${clock(booking.startTime)}` : `At ${clock(booking.startTime)}`;
        add({ key: `poreia:start:${booking.id}:${booking.startDate}T${booking.startTime}`, kind: 'trip', at: less(leaves, choices.otherLead), title: booking.title, body: words(what, booking.address, code), open });
      }
    } else if (booking.startDate && booking.kind === 'stay') {
      add({ key: `poreia:start:${booking.id}:${booking.startDate}`, kind: 'trip', at: atTime(booking.startDate, MORNING), title: booking.title, body: words('Check-in today', booking.address, code), open });
    }
    if ((booking.kind === 'stay' || booking.kind === 'car') && booking.endDate && booking.endDate !== booking.startDate) {
      const what = booking.kind === 'stay' ? 'Check-out' : 'Return';
      const at = booking.endTime ? less(atTime(booking.endDate, booking.endTime), choices.otherLead) : atTime(booking.endDate, MORNING);
      add({ key: `poreia:end:${booking.id}:${booking.endDate}T${booking.endTime ?? ''}`, kind: 'trip', at, title: booking.title, body: booking.endTime ? `${what} by ${clock(booking.endTime)}` : `${what} today`, open });
    }
  }

  for (const item of plans) {
    if (!item.time || !trips.some((trip) => trip.id === item.tripId)) continue;
    add({ key: `poreia:plan:${item.id}:${item.date}T${item.time}`, kind: 'trip', at: less(atTime(item.date, item.time), choices.otherLead), title: item.title, body: words(`At ${clock(item.time)}`, item.where), open: `poreia:plan:${item.id}` });
  }

  if (choices.dayBefore) {
    for (const trip of trips) {
      if (!trip.start) continue;
      const eve = addDays(trip.start, -1);
      const first = daysOf(trip, bookings.filter((each) => each.tripId === trip.id), plans.filter((each) => each.tripId === trip.id)).find((day) => day.date === trip.start)?.entries[0];
      const left = packing.filter((each) => each.tripId === trip.id && !each.packed).length;
      add({
        key: `poreia:eve:${trip.id}:${trip.start}`,
        kind: 'trip',
        at: atTime(eve, EVENING),
        title: `${trip.name} tomorrow`,
        body: words(first ? `${first.time ? `${clock(first.time)} ` : ''}${entryTitle(first)}` : undefined, left ? `${left} ${left === 1 ? 'thing' : 'things'} left to pack` : undefined) || trip.place?.label || trip.place?.name || 'Starts tomorrow',
        open: `poreia:trip:${trip.id}`,
      });
    }
  }
  return notices;
}
