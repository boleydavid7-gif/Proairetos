import { useEffect, useState } from 'react';
import { notifications } from '../../app/notify/notifications';
import { addDays } from '../../core/scheduling/dates';
import { Waiting } from '../../lamplight/Waiting';
import { bookings, settings, today } from '../app/state';
import { flightStatus, travelReady } from '../app/world';
import { changes, clockAt, flightNumberOf, minutesLate, statusWords, type FlightEnd, type FlightStatus } from '../core/flights';
import type { Booking, Trip } from '../core/model';

const LAST = 'poreiaFlight.';
const remembered = (id: string): FlightStatus | undefined => {
  try {
    return JSON.parse(localStorage.getItem(LAST + id) ?? 'null') ?? undefined;
  } catch {
    return undefined;
  }
};

/** A flight's status, looked at every five minutes while the page is in view; a change shows as a notice. */
function useFlight(booking: Booking): { flight?: FlightStatus; looked?: Date; unreached: boolean; refresh: () => void } {
  const number = flightNumberOf(booking);
  const [state, setState] = useState<{ flight?: FlightStatus; looked?: Date; unreached: boolean }>(() => ({ flight: remembered(booking.id), unreached: false }));
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!number || !booking.startDate) return;
    let live = true;
    const look = async () => {
      if (document.visibilityState !== 'visible' || !(await travelReady()).status) return;
      try {
        const found = (await flightStatus(number, booking.startDate!))[0];
        if (!live || !found) return;
        const said = changes(remembered(booking.id), found);
        localStorage.setItem(LAST + booking.id, JSON.stringify(found));
        setState({ flight: found, looked: new Date(), unreached: false });
        if (said.length && settings.load().notices.on)
          void notifications.showNow({ key: `flight-${booking.id}-${Date.now()}`, kind: 'trip', at: new Date(), title: `${number.replace(/^(..)/, '$1 ')}`, body: said.join(' · '), open: `poreia:booked:${booking.id}` });
      } catch {
        if (live) setState((current) => ({ ...current, unreached: true }));
      }
    };
    void look();
    const timer = window.setInterval(() => void look(), 5 * 60_000);
    document.addEventListener('visibilitychange', look);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', look);
    };
  }, [number, booking.startDate, round]);
  return { ...state, refresh: () => setRound((count) => count + 1) };
}

function End({ label, at }: { label: string; at: FlightEnd }) {
  const late = minutesLate(at);
  const shown = clockAt(at.actual ?? at.expected ?? at.scheduled);
  return (
    <div className="poreia-flight__end">
      <p className="label">
        {label}
        {at.code ? ` · ${at.code}` : ''}
      </p>
      <p className="poreia-flight__time">
        {shown}
        {late > 0 && at.scheduled && <s className="muted"> {clockAt(at.scheduled)}</s>}
      </p>
      <p className="muted">{[at.terminal && `Terminal ${at.terminal}`, at.gate && `Gate ${at.gate}`, at.desk && `Check-in ${at.desk}`, at.belt && `Bags at belt ${at.belt}`].filter(Boolean).join(' · ') || at.airport}</p>
    </div>
  );
}

/** One flight's status: departure and arrival, terminals, gates, belt, and the airline's word for it. */
export function FlightStatusCard({ booking }: { booking: Booking }) {
  const { flight, looked, unreached, refresh } = useFlight(booking);
  const [ready, setReady] = useState<boolean>();
  useEffect(() => {
    void travelReady().then((answer) => setReady(answer.status));
  }, []);
  if (!flightNumberOf(booking) || !ready) return null;
  return (
    <section className="card poreia-flight">
      <div className="section-head">
        <h2 className="card__title">{flight ? statusWords(flight) : 'Flight status'}</h2>
        <button type="button" className="text-link" onClick={refresh}>
          Check now
        </button>
      </div>
      {!flight && !unreached && (
        <p className="muted">
          <Waiting>Looking…</Waiting>
        </p>
      )}
      {!flight && unreached && <p className="muted">Couldn’t reach flight status. Check the connection.</p>}
      {flight && (
        <>
          <div className="poreia-flight__ends">
            <End label="Departs" at={flight.departure} />
            <End label="Arrives" at={flight.arrival} />
          </div>
          <p className="fine">
            {[flight.airline, flight.aircraft, looked ? `Checked ${looked.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : undefined].filter(Boolean).join(' · ')}. From AeroDataBox.
          </p>
        </>
      )}
    </section>
  );
}

/** The trip's flights leaving today or tomorrow, each with its status. */
export function TripFlights({ trip }: { trip: Trip }) {
  const day = today();
  const soon = bookings
    .use()
    .filter((each) => each.tripId === trip.id && each.kind === 'flight' && each.startDate && each.startDate >= day && each.startDate <= addDays(day, 1))
    .sort((a, b) => `${a.startDate}${a.startTime ?? ''}`.localeCompare(`${b.startDate}${b.startTime ?? ''}`));
  return (
    <>
      {soon.map((booking) => (
        <FlightStatusCard key={booking.id} booking={booking} />
      ))}
    </>
  );
}
