import { ChevronIcon, PlusIcon } from '../../app/family/icons';
import type { PoreiaNav } from '../app/App';
import { bookings } from '../app/state';
import { dayText, timeText } from '../app/ui';
import { kindLabel, moneyText, type Booking, type BookingKind, type Trip } from '../core/model';
import RouteEmpty from './RouteEmpty';
import { Sym, type GlyphName } from '../../lamplight/icons';

/** Each kind of booking's own drawn mark. */
export const KIND_GLYPH: Record<BookingKind, GlyphName> = {
  flight: 'plane',
  stay: 'bed',
  car: 'car',
  train: 'train',
  bus: 'bus',
  cruise: 'ship',
  event: 'ticket',
  tour: 'pin',
  food: 'plate',
  other: 'paperclip',
};

const when = (booking: Booking) => {
  if (!booking.startDate) return 'No date';
  const start = `${dayText(booking.startDate)}${booking.startTime ? `, ${timeText(booking.startTime)}` : ''}`;
  if (booking.endDate && booking.endDate !== booking.startDate) return `${start} – ${dayText(booking.endDate)}`;
  return start;
};

/** Every booking of the trip, in date order, each opening its details. */
export default function TripBookings({ trip, nav }: { trip: Trip; nav: PoreiaNav }) {
  const list = bookings
    .use()
    .filter((each) => each.tripId === trip.id)
    .sort((a, b) => `${a.startDate ?? '9999'}${a.startTime ?? ''}`.localeCompare(`${b.startDate ?? '9999'}${b.startTime ?? ''}`));
  return (
    <>
      {list.length > 0 && (
      <div className="button-row">
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'booking', tripId: trip.id, paste: true })}>
          Paste a confirmation
        </button>
        <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'booking', tripId: trip.id })}>
          <PlusIcon size={18} />
          Add by hand
        </button>
      </div>
      )}
      {list.length === 0 ? (
        <RouteEmpty glyph="plane" title="No bookings yet" line="Flights, stays, cars, tickets: paste a confirmation, bring in a file or add one by hand.">
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'booking', tripId: trip.id, paste: true })}>
          Paste a confirmation
        </button>
        <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'booking', tripId: trip.id })}>
          <PlusIcon size={18} />
          Add by hand
        </button>
        </RouteEmpty>
      ) : (
        <ul className="rows poreia-bookings">
          {list.map((booking) => (
            <li key={booking.id}>
              <button type="button" className="row" onClick={() => nav.go({ name: 'booking', tripId: trip.id, id: booking.id })}>
                <span className="row__icon"><Sym name={KIND_GLYPH[booking.kind]} size={22} /></span>
                <span className="row__text">
                  <span>{booking.title}</span>
                  <span className="row__detail">{[kindLabel(booking.kind), when(booking), booking.confirmation].filter(Boolean).join(' · ')}</span>
                </span>
                {booking.cost && <span className="poreia-trip-row__when">{moneyText(booking.cost)}</span>}
                <ChevronIcon size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
