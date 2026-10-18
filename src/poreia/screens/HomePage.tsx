import type { Nav } from '../app/App';
import { CalendarIcon, PtoIcon, TripsIcon } from '../app/icons';
import { useLeaveRequests, usePtoAccounts, usePtoLedger, useTrips, useWorkProfiles } from '../app/state';
import { balanceAt, dateText } from '../core/pto';
import { formatDate } from '../../oikonomia/core/bills';
import { PoreiaHeader } from '../app/ui';

export default function HomePage({ nav }: { nav: Nav }) {
  const profiles = useWorkProfiles();
  const accounts = usePtoAccounts();
  const ledger = usePtoLedger();
  const requests = useLeaveRequests();
  const trips = useTrips();
  const profile = profiles[0];
  const account = accounts[0];
  const today = dateText(new Date());
  const balance = profile && account ? balanceAt(account, ledger, profile, today, requests) : undefined;
  const nextTrip = trips.find((trip) => trip.startDate && trip.startDate >= today);
  return (
    <div className="home poreia-home">
      <PoreiaHeader eyebrow="Your next chapter" title={nextTrip?.name ?? 'Where will you go?'} />
      <div className="page page--under-hero">
        <section className="poreia-stat-grid" aria-label="Travel overview">
          <div className="poreia-stat"><small>Trips planned</small><strong>{trips.length}</strong></div>
          <div className="poreia-stat"><small>Leave accounts</small><strong>{accounts.length}</strong></div>
          <div className="poreia-stat"><small>Available PTO</small><strong>{balance !== undefined ? `${balance} h` : 'Set up'}</strong></div>
          <div className="poreia-stat"><small>Upcoming leave</small><strong>{requests.filter((request) => ['requested', 'pending', 'approved'].includes(request.status)).length}</strong></div>
        </section>

        {!profile || !account ? (
          <section className="card poreia-card poreia-empty">
            <PtoIcon size={28} />
            <h2 className="card__title">Set up your work leave</h2>
            <p className="muted">Poreia uses your actual schedule and leave policy to find vacation windows that fit.</p>
            <button type="button" className="button-main" onClick={() => nav.swap({ name: 'pto' })}>Set up PTO</button>
          </section>
        ) : (
          <section className="card poreia-card poreia-section">
            <div className="poreia-section-head"><h2>Next useful step</h2><span className="label">PTO ready</span></div>
            <p className="muted">You have {balance} hours projected in {account.name}. Find a realistic vacation window or create a trip.</p>
            <div className="button-row"><button type="button" className="button-main" onClick={() => nav.swap({ name: 'calendar' })}>Find a window</button><button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'trips' })}>Create a trip</button></div>
          </section>
        )}

        {nextTrip && <section className="poreia-section"><div className="poreia-section-head"><h2>Coming up</h2><button type="button" className="text-link" onClick={() => nav.swap({ name: 'trips' })}>See trips</button></div><div className="poreia-row"><TripsIcon size={24} /><span className="poreia-row__text"><strong>{nextTrip.destination || 'Destination to decide'}</strong><small>{nextTrip.startDate && nextTrip.endDate ? `${formatDate(nextTrip.startDate, 'long')} – ${formatDate(nextTrip.endDate, 'long')}` : 'Dates to decide'}</small></span></div></section>}

        <section className="poreia-section"><div className="poreia-section-head"><h2>Quick actions</h2></div><div className="button-row"><button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'trips' })}><TripsIcon size={18} /> New trip</button><button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'discover' })}><CalendarIcon size={18} /> Save a place</button></div></section>
      </div>
    </div>
  );
}
