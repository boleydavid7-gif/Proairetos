import { BedIcon, ChevronIcon, PlaneIcon, PlusIcon } from '../../app/family/icons';
import type { PoreiaNav } from '../app/App';
import { bookings } from '../app/state';
import { dayText, timeText } from '../app/ui';
import { kindLabel, moneyText, type Booking, type Trip } from '../core/model';

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
      <div className="button-row">
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'booking', tripId: trip.id, paste: true })}>
          Paste a confirmation
        </button>
        <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'booking', tripId: trip.id })}>
          <PlusIcon size={18} />
          Add by hand
        </button>
      </div>
      {list.length === 0 ? (
        <p className="muted">Flights, stays, cars, cruises, tickets: each booking keeps its confirmation, times and cost here, and shows on its day.</p>
      ) : (
        <ul className="rows poreia-bookings">
          {list.map((booking) => (
            <li key={booking.id}>
              <button type="button" className="row" onClick={() => nav.go({ name: 'booking', tripId: trip.id, id: booking.id })}>
                <span className="row__icon">{booking.kind === 'flight' ? <PlaneIcon size={22} /> : booking.kind === 'stay' ? <BedIcon size={22} /> : <span className="poreia-kind-letter">{kindLabel(booking.kind).slice(0, 1)}</span>}</span>
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
