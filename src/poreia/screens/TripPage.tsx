import { useEffect, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { BackLink } from '../../askesis/app/ui';
import { transition } from '../../app/transitions';
import type { PoreiaNav } from '../app/App';
import { countHours, saveTimeOff, setStatus } from '../app/proairetos';
import { newId, nowStamp, plans, settings, timeOff, today, trips } from '../app/state';
import { datesText } from '../app/ui';
import { nightsOf, phaseOf, phaseText, type Trip } from '../core/model';
import { hoursText, leftAfter, STATUS_LABEL, type TimeOff } from '../core/timeOff';
import { BookLinks, CountryCard, EventsCard, GuideCard, SightsCard, Weather, type Target } from '../components/Destination';
import TripBookings from '../components/TripBookings';
import TripDays from '../components/TripDays';
import TripPacking from '../components/TripPacking';
import TripMoney from '../components/TripMoney';

export type TripView = 'overview' | 'bookings' | 'days' | 'packing' | 'money';

const VIEWS: { id: TripView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'days', label: 'Days' },
  { id: 'packing', label: 'Packing' },
  { id: 'money', label: 'Money' },
];

export default function TripPage({ nav, id, view: first }: { nav: PoreiaNav; id: string; view?: TripView }) {
  const trip = trips.use().find((each) => each.id === id);
  const [view, setView] = useState<TripView>(first ?? 'overview');
  if (!trip) {
    return (
      <div className="page poreia-page">
        <BackLink label="Trips" onBack={nav.back} />
        <p className="muted">This trip isn’t here anymore.</p>
      </div>
    );
  }
  const day = today();
  const phase = phaseOf(trip, day);
  const nights = nightsOf(trip);
  const pick = (next: TripView) => transition(VIEWS.findIndex((each) => each.id === next) < VIEWS.findIndex((each) => each.id === view) ? 'back' : 'forward', () => setView(next), 'panel');

  return (
    <div className="page poreia-page poreia-trip">
      <BackLink label="Trips" onBack={nav.back} />
      <div className="detail-head poreia-trip__head">
        <h1 className="title">{trip.name}</h1>
        <p>{[trip.place && trip.place.name !== trip.name ? trip.place.label ?? trip.place.name : undefined, datesText(trip.start, trip.end)].filter(Boolean).join(' · ') || 'No place or dates yet'}</p>
        <p className="muted">
          {[phaseText(phase), nights ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : undefined, `${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}`, trip.stage === 'idea' ? 'Idea' : trip.stage === 'planning' ? 'Planning' : 'Booked'].filter(Boolean).join(' · ')}
        </p>
        <button type="button" className="text-link" onClick={() => nav.go({ name: 'trip-form', id: trip.id })}>
          Edit
        </button>
      </div>

      <div className="chip-row poreia-scroll-chips poreia-views" role="tablist" aria-label="Trip">
        {VIEWS.map((each) => (
          <button key={each.id} type="button" role="tab" className="chip" aria-selected={view === each.id} aria-pressed={view === each.id} onClick={() => pick(each.id)}>
            {each.label}
          </button>
        ))}
      </div>

      <div className="vt-panel" key={view}>
        {view === 'overview' && <Overview trip={trip} nav={nav} day={day} />}
        {view === 'bookings' && <TripBookings trip={trip} nav={nav} />}
        {view === 'days' && <TripDays trip={trip} />}
        {view === 'packing' && <TripPacking trip={trip} />}
        {view === 'money' && <TripMoney trip={trip} />}
      </div>
    </div>
  );
}

function Overview({ trip, nav, day }: { trip: Trip; nav: PoreiaNav; day: string }) {
  const target: Target | undefined = trip.place ? { place: trip.place, from: trip.from, start: trip.start, end: trip.end, travelers: trip.travelers } : undefined;
  const addToDays = (title: string, date?: string, where?: string) => {
    const item = { id: newId(), tripId: trip.id, date: date && trip.start && date >= trip.start && date <= (trip.end ?? trip.start) ? date : trip.start ?? day, title, where, createdAt: nowStamp(), updatedAt: nowStamp() };
    plans.put(item);
    offerUndo(`“${title}” added to the days`, () => plans.remove(item.id));
  };
  return (
    <>
      <TimeOffCard trip={trip} nav={nav} />
      {!target && (
        <section className="card first-run">
          <p className="muted">Add where you’re going for weather, a guide, things nearby and booking searches.</p>
          <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'trip-form', id: trip.id })}>
            Add a place
          </button>
        </section>
      )}
      {target && (
        <>
          <BookLinks target={target} />
          <Weather target={target} today={day} />
          <EventsCard target={target} onAdd={(event) => addToDays(event.name, event.date, event.venue)} />
          <SightsCard place={target.place} onAdd={(sight) => addToDays(sight.title)} />
          <CountryCard target={target} />
          <GuideCard place={target.place} />
        </>
      )}
      {trip.notes && (
        <section className="card">
          <h2 className="card__title">Notes</h2>
          <p className="poreia-notes">{trip.notes}</p>
        </section>
      )}
    </>
  );
}

/** The trip's time off: hours its dates take from work in Proairetos, and where the request stands. */
function TimeOffCard({ trip, nav }: { trip: Trip; nav: PoreiaNav }) {
  const offs = timeOff.use();
  const setup = settings.use().timeOff;
  const linked = offs.find((off) => off.tripId === trip.id && off.status !== 'canceled');
  const [needed, setNeeded] = useState<{ hours: number; hasSchedule: boolean }>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!trip.start || linked) return;
    let live = true;
    void countHours(trip.start, trip.end ?? trip.start).then((counted) => live && setNeeded(counted));
    return () => {
      live = false;
    };
  }, [trip.start, trip.end, linked?.id]);

  if (!trip.start) return null;
  if (!linked) {
    return (
      <section className="card poreia-off-card">
        <h2 className="card__title">Time off</h2>
        <p>
          {needed === undefined ? 'Counting…' : needed.hours === 0 ? 'No work in these dates.' : `These dates take ${hoursText(needed.hours)} of work${needed.hasSchedule ? ', from your schedule in Proairetos' : ''}.`}
        </p>
        {needed && needed.hours > 0 && setup && (
          <p className="muted">{hoursText(leftAfter(setup, offs, { id: 'new', start: trip.start, hours: needed.hours }).after)} left after, with everything planned before it.</p>
        )}
        {needed && needed.hours > 0 && (
          <button
            type="button"
            className="button-quiet"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const record: TimeOff = { id: newId(), tripId: trip.id, title: trip.name, start: trip.start!, end: trip.end ?? trip.start!, status: 'planned', hours: needed.hours, createdAt: nowStamp(), updatedAt: nowStamp() };
              const saved = await saveTimeOff(record);
              setBusy(false);
              offerUndo('Time off planned', () => timeOff.remove(saved.id));
            }}
          >
            Plan the time off
          </button>
        )}
      </section>
    );
  }
  const left = setup ? leftAfter(setup, offs, linked) : undefined;
  return (
    <section className="card poreia-off-card">
      <div className="section-head">
        <h2 className="card__title">Time off</h2>
        <span className={`poreia-status poreia-status--${linked.status}`}>{STATUS_LABEL[linked.status]}</span>
      </div>
      <p>
        {hoursText(linked.hours)} · {datesText(linked.start, linked.end)}
        {left ? ` · ${hoursText(left.after)} left after` : ''}
      </p>
      {linked.status === 'approved' && (linked.replaced?.length ?? 0) > 0 && <p className="muted">Work shifts on these days are off your Proairetos schedule.</p>}
      <div className="button-row">
        {linked.status === 'planned' && (
          <button type="button" className="button-quiet" disabled={busy} onClick={async () => { setBusy(true); await setStatus(linked, 'requested'); setBusy(false); }}>
            Mark requested
          </button>
        )}
        {linked.status !== 'approved' && (
          <button
            type="button"
            className="button-quiet"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const before = linked;
              const saved = await setStatus(linked, 'approved');
              setBusy(false);
              const shifts = saved.replaced?.length ?? 0;
              offerUndo(shifts ? `Approved: ${shifts} ${shifts === 1 ? 'shift' : 'shifts'} off your schedule` : 'Approved', () => void saveTimeOff(before, saved));
            }}
          >
            Mark approved
          </button>
        )}
        <button type="button" className="text-link" onClick={() => nav.go({ name: 'time-off', id: linked.id })}>
          Details
        </button>
      </div>
      {!setup && (
        <button type="button" className="text-link" onClick={() => nav.go({ name: 'time-setup' })}>
          Set up your balance
        </button>
      )}
    </section>
  );
}
