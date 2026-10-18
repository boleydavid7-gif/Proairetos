import type { Nav } from '../app/App';
import { CalendarIcon, DiscoverIcon, PtoIcon, TripsIcon } from '../app/icons';
import { useBookings, useItineraryItems, useLeaveRequests, usePtoAccounts, usePtoLedger, useTrips, useWorkProfiles } from '../app/state';
import { balanceAt, dateText } from '../core/pto';
import { formatDate } from '../../oikonomia/core/bills';
import { PoreiaHeader } from '../app/ui';

function tripLabel(status: string): string {
  return status === 'in-progress' ? 'In progress' : status[0].toUpperCase() + status.slice(1);
}

export default function HomePage({ nav }: { nav: Nav }) {
  const profiles = useWorkProfiles();
  const accounts = usePtoAccounts();
  const ledger = usePtoLedger();
  const requests = useLeaveRequests();
  const trips = useTrips();
  const bookings = useBookings();
  const itineraryItems = useItineraryItems();
  const profile = profiles[0];
  const account = accounts[0];
  const today = dateText(new Date());
  const balance = profile && account ? balanceAt(account, ledger, profile, today, requests) : undefined;
  const activeTrips = trips.filter((trip) => !['completed', 'canceled'].includes(trip.status));
  const nextTrip = [...activeTrips].sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999'))[0];
  const planningTrips = activeTrips.filter((trip) => ['idea', 'planning', 'tentative'].includes(trip.status));
  const openBookings = bookings.filter((booking) => booking.status === 'planned' || booking.status === 'reserved').length;
  const openItinerary = itineraryItems.filter((item) => item.status === 'planned').length;
  const planningItems = openBookings + openItinerary;
  const upcomingLeave = requests.filter((request) => ['requested', 'pending', 'approved'].includes(request.status)).length;

  return <div className="home poreia-home">
    <PoreiaHeader eyebrow="YOUR NEXT ADVENTURE" title={nextTrip ? nextTrip.name : 'Where will you go?'}>
      <div className="poreia-header__intro">
        <p>{nextTrip ? `${nextTrip.destination || 'Destination to decide'}${nextTrip.startDate && nextTrip.endDate ? ` · ${formatDate(nextTrip.startDate, 'long')} – ${formatDate(nextTrip.endDate, 'long')}` : ' · Dates to decide'}` : 'Find your next escape and make the most of your time away.'}</p>
        <div className="poreia-hero-actions">
          <button type="button" className="button-main" onClick={() => nextTrip ? nav.go({ name: 'trip', id: nextTrip.id }) : nav.swap({ name: 'trips' })}>{nextTrip ? 'Continue planning' : 'Plan a trip'}</button>
          <button type="button" className="button-quiet" onClick={() => nav.swap({ name: nextTrip ? 'trips' : 'discover' })}>{nextTrip ? 'Plan a new trip' : 'Explore destinations'}</button>
        </div>
      </div>
    </PoreiaHeader>

    <div className="page page--under-hero poreia-home-content">
      <section className="poreia-stat-grid" aria-label="Travel overview">
        <button type="button" className="poreia-stat poreia-stat--button" onClick={() => nav.swap({ name: 'trips' })}><small>Upcoming trips</small><strong>{activeTrips.length || '—'}</strong><span>{activeTrips.length ? 'View your plans' : 'No trips planned yet'}</span></button>
        <button type="button" className="poreia-stat poreia-stat--button" onClick={() => nav.swap({ name: 'trips' })}><small>Being planned</small><strong>{planningTrips.length || '—'}</strong><span>{planningTrips.length ? 'Keep them moving' : 'Start with an idea'}</span></button>
        <button type="button" className="poreia-stat poreia-stat--button" onClick={() => nextTrip ? nav.go({ name: 'trip', id: nextTrip.id }) : nav.swap({ name: 'trips' })}><small>Planning items</small><strong>{planningItems || '—'}</strong><span>{planningItems ? 'Bookings and activities' : 'Nothing waiting'}</span></button>
        <button type="button" className="poreia-stat poreia-stat--button" onClick={() => nav.go({ name: 'vacation' })}><small>Vacation availability</small><strong>{balance !== undefined ? `${balance} h` : '—'}</strong><span>{balance !== undefined ? `${upcomingLeave} leave planned` : 'Set up optional tracking'}</span></button>
      </section>

      {nextTrip ? <section className="poreia-section"><div className="poreia-section-head"><h2>Next trip</h2><button type="button" className="text-link" onClick={() => nav.swap({ name: 'trips' })}>See all</button></div><button type="button" className="poreia-row poreia-row--button poreia-trip-preview" onClick={() => nav.go({ name: 'trip', id: nextTrip.id })}><TripsIcon size={24} /><span className="poreia-row__text"><strong>{nextTrip.destination || 'Destination to decide'}</strong><small>{nextTrip.startDate && nextTrip.endDate ? `${formatDate(nextTrip.startDate, 'long')} – ${formatDate(nextTrip.endDate, 'long')}` : 'Dates to decide'} · {tripLabel(nextTrip.status)}</small></span><span className="poreia-balance">Open</span></button></section> : <section className="card poreia-card poreia-empty"><TripsIcon size={28} /><h2 className="card__title">Your next escape starts here</h2><p className="muted">Create a trip with a destination and dates, or leave both open while you explore.</p><div className="button-row"><button type="button" className="button-main" onClick={() => nav.swap({ name: 'trips' })}>Plan a trip</button><button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'discover' })}>Explore destinations</button></div></section>}

      <section className="poreia-section"><div className="poreia-section-head"><h2>Plan your next step</h2></div><div className="poreia-action-grid">
        <button type="button" className="poreia-action-tile" onClick={() => nav.swap({ name: 'trips' })}><TripsIcon size={20} /><span><strong>Plan a trip</strong><small>Start with an idea</small></span></button>
        <button type="button" className="poreia-action-tile" onClick={() => nav.swap({ name: 'discover' })}><DiscoverIcon size={20} /><span><strong>Explore</strong><small>Save a destination</small></span></button>
        <button type="button" className="poreia-action-tile" onClick={() => nextTrip ? nav.go({ name: 'trip', id: nextTrip.id }) : nav.swap({ name: 'trips' })}><CalendarIcon size={20} /><span><strong>{nextTrip ? 'Build itinerary' : 'Choose dates'}</strong><small>{nextTrip ? 'Shape each day' : 'Find a window'}</small></span></button>
        <button type="button" className="poreia-action-tile" onClick={() => nav.go({ name: 'vacation' })}><PtoIcon size={20} /><span><strong>Find vacation dates</strong><small>Optional work planning</small></span></button>
      </div></section>
    </div>
  </div>;
}
