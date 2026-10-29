import { useEffect, useState, type CSSProperties } from 'react';
import { Sym, type GlyphName } from '../../lamplight/icons';
import { offerUndo } from '../../app/family/shell';
import { BackLink } from '../../askesis/app/ui';
import { transition } from '../../app/transitions';
import type { PoreiaNav } from '../app/App';
import { countHours, saveTimeOff, setStatus } from '../app/proairetos';
import { bookings, journal, newId, nowStamp, packing, plans, settings, timeOff, today, trips } from '../app/state';
import { datesText, dayText } from '../app/ui';
import { daysOf, nextUp, nightsOf, phaseOf, phaseText, placesOf, STAGE_TEXT, stageOf, stopNow, stopOn, type Trip } from '../core/model';
import { hoursText, leftAfter, STATUS_LABEL, type TimeOff } from '../core/timeOff';
import TripBookings from '../components/TripBookings';
import TripDays, { AddToDay, AgendaRow, openEntry } from '../components/TripDays';
import TripPacking from '../components/TripPacking';
import TripMoney from '../components/TripMoney';
import TripJournal from '../components/TripJournal';
import { TogetherCard } from '../components/Together';
import { DocumentsCard } from '../components/Arriving';
import { GoalCard, useEnvelopeSync } from '../components/TripGoals';
import { TripScene } from '../components/TripScene';
import RouteEmpty from '../components/RouteEmpty';

export type TripView = 'overview' | 'bookings' | 'days' | 'packing' | 'money' | 'journal';

const VIEWS: { id: TripView; label: string; glyph: GlyphName }[] = [
  { id: 'overview', label: 'Overview', glyph: 'home' },
  { id: 'days', label: 'Days', glyph: 'calendar' },
  { id: 'bookings', label: 'Bookings', glyph: 'ticket' },
  { id: 'packing', label: 'Packing', glyph: 'suitcase' },
  { id: 'money', label: 'Money', glyph: 'wallet' },
  { id: 'journal', label: 'Journal', glyph: 'book' },
];

// The part of each trip last open, so coming back from a place, a booking or another tab lands where the person was.
const lastView = new Map<string, TripView>();

export default function TripPage({ nav, id, view: first }: { nav: PoreiaNav; id: string; view?: TripView }) {
  const trip = trips.use().find((each) => each.id === id);
  const [view, setView] = useState<TripView>(() => first ?? lastView.get(id) ?? 'overview');
  useEffect(() => {
    lastView.set(id, view);
  }, [id, view]);
  const [stopId, setStopId] = useState<string>();
  useEnvelopeSync(trip);
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
  const stops = placesOf(trip);
  const stop = stops.find((each) => each.id === stopId) ?? stopNow(trip, day);
  const nights = nightsOf(trip);
  const pick = (next: TripView) => transition(VIEWS.findIndex((each) => each.id === next) < VIEWS.findIndex((each) => each.id === view) ? 'back' : 'forward', () => setView(next), 'panel');

  return (
    <div className="page poreia-page poreia-trip">
      <TripScene trip={trip} place={stop?.place} />
      <BackLink label="Trips" onBack={nav.back} />
      <div className="detail-head poreia-trip__head">
        <h1 className="title">{trip.name}</h1>
        <p>{[stops.length > 1 ? stops.map((each) => each.place.name).join(' → ') : trip.place && trip.place.name !== trip.name ? trip.place.label ?? trip.place.name : undefined, datesText(trip.start, trip.end)].filter(Boolean).join(' · ') || 'No place or dates yet'}</p>
        <p className="muted">
          {[phase.kind === 'someday' ? undefined : phaseText(phase), nights ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : undefined, `${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}`, STAGE_TEXT[stageOf(trip, bookings.list().filter((each) => each.tripId === trip.id))]].filter(Boolean).join(' · ')}
        </p>
        <button type="button" className="text-link" onClick={() => nav.go({ name: 'trip-form', id: trip.id })}>
          Edit
        </button>
      </div>

      <div className="poreia-tabs" role="tablist" aria-label="Trip" style={{ '--at': VIEWS.findIndex((each) => each.id === view), '--count': VIEWS.length } as CSSProperties}>
        {VIEWS.map((each) => {
          // While the trip is on, its first place is the day itself.
          const today = each.id === 'overview' && phase.kind === 'now';
          return (
            <button key={each.id} type="button" role="tab" className="poreia-tabs__tab" aria-selected={view === each.id} onClick={() => pick(each.id)}>
              <Sym name={today ? 'today' : each.glyph} size={22} />
              <span>{today ? 'Today' : each.label}</span>
            </button>
          );
        })}
      </div>

      {stops.length > 1 && (view === 'overview' || view === 'bookings') && (
        <div className="chip-row poreia-scroll-chips poreia-stop-chips" role="group" aria-label="Stop">
          {stops.map((each) => (
            <button key={each.id} type="button" className="chip" aria-pressed={each.id === stop?.id} onClick={() => setStopId(each.id)}>
              {each.place.name}
              {each.start && <span className="muted"> {datesText(each.start, each.end)}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="vt-panel" key={view}>
        {view === 'overview' && <Overview trip={trip} nav={nav} day={day} onView={pick} />}
        {view === 'bookings' && <TripBookings trip={trip} nav={nav} />}
        {view === 'days' && <TripDays trip={trip} nav={nav} />}
        {view === 'packing' && <TripPacking trip={trip} />}
        {view === 'money' && <TripMoney trip={trip} />}
        {view === 'journal' && <TripJournal trip={trip} />}
      </div>
    </div>
  );
}

function Overview({ trip, nav, day, onView }: { trip: Trip; nav: PoreiaNav; day: string; onView: (view: TripView) => void }) {
  const phase = phaseOf(trip, day);
  const ahead = phase.kind !== 'past';
  const entries = journal.use().filter((entry) => entry.tripId === trip.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const about = (
    <>
      {ahead && <DocumentsCard trip={trip} nav={nav} />}
      <GoalCard trip={trip} />
      <TogetherCard trip={trip} />
      <section className="card poreia-journal-preview">
        <div className="section-head">
          <h2 className="card__title">Travel journal</h2>
          {entries.length > 0 && <span className="muted">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>}
        </div>
        {entries[0] ? <p className="poreia-journal-preview__text">{entries[0].title || entries[0].text}</p> : null}
        <button type="button" className="button-quiet" onClick={() => onView('journal')}>{entries.length ? 'Open journal' : 'Start journal'}</button>
      </section>
      {trip.notes && (
        <section className="card">
          <h2 className="card__title">Notes</h2>
          <p className="poreia-notes">{trip.notes}</p>
        </section>
      )}
    </>
  );
  // Under way: the day first, the rest of the trip one tap away.
  if (phase.kind === 'now') {
    return (
      <>
        <TodayCard trip={trip} nav={nav} day={day} onView={onView} />
        <PlanningNextCard trip={trip} nav={nav} onView={onView} />
        <details className="poreia-fold poreia-more">
          <summary>More about this trip</summary>
          {about}
        </details>
      </>
    );
  }
  return (
    <>
      <PlanningNextCard trip={trip} nav={nav} onView={onView} />
      <NextUpCard trip={trip} nav={nav} day={day} />
      <TimeOffCard trip={trip} nav={nav} />
      {!trip.place && (
        <RouteEmpty glyph="pin" title="Where to?">
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'trip-form', id: trip.id })}>
            Add a place
          </button>
        </RouteEmpty>
      )}
      {about}
    </>
  );
}

/** One concrete planning action, chosen from what this trip is still missing. */
function PlanningNextCard({ trip, nav, onView }: { trip: Trip; nav: PoreiaNav; onView: (view: TripView) => void }) {
  const bookingList = bookings.use().filter((each) => each.tripId === trip.id);
  const planList = plans.use().filter((each) => each.tripId === trip.id);
  const packingList = packing.use().filter((each) => each.tripId === trip.id);
  const phase = phaseOf(trip, today());
  if (phase.kind === 'past') return null;

  const action = !trip.place
    ? { title: 'Choose where you’re going', detail: 'Add the destination or destinations for this trip.', label: 'Add a destination', run: () => nav.go({ name: 'trip-form', id: trip.id }) }
    : !trip.start
      ? { title: 'Choose your dates', detail: 'Set the days before adding bookings and plans.', label: 'Add dates', run: () => nav.go({ name: 'trip-form', id: trip.id }) }
      : bookingList.length === 0
        ? { title: 'Add your first booking', detail: 'Paste a confirmation, upload a file, or enter one by hand.', label: 'Add a booking', run: () => nav.go({ name: 'booking', tripId: trip.id, paste: true }) }
        : planList.length === 0
          ? { title: 'Shape your days', detail: 'Add a place or activity to the itinerary when you are ready.', label: 'Open the itinerary', run: () => onView('days') }
          : packingList.length === 0
            ? { title: 'Start your packing list', detail: 'Poreia can suggest a list from the trip length and bookings.', label: 'Start packing', run: () => onView('packing') }
            : undefined;

  if (!action) return null;
  return (
    <section className="card poreia-next-action" data-ll-lit>
      <h2 className="card__title">Next up</h2>
      <p className="poreia-next-action__title">{action.title}</p>
      <p className="muted">{action.detail}</p>
      <button type="button" className="button-main" onClick={action.run}>
        {action.label}
      </button>
    </section>
  );
}

/** A day of a trip under way: where, the sky, what is set, and the next steps a tap away. */
function TodayCard({ trip, nav, day, onView }: { trip: Trip; nav: PoreiaNav; day: string; onView: (view: TripView) => void }) {
  const theirBookings = bookings.use().filter((each) => each.tripId === trip.id);
  const theirPlans = plans.use().filter((each) => each.tripId === trip.id);
  const phase = phaseOf(trip, day);
  const entries = daysOf(trip, theirBookings, theirPlans).find((each) => each.date === day)?.entries ?? [];
  const where = stopOn(trip, day)?.place.name ?? trip.place?.name;
  return (
    <section className="card poreia-today">
      <p className="poreia-today__eyebrow">{[phase.kind === 'now' ? `Day ${phase.day} of ${phase.of}` : undefined, where].filter(Boolean).join(' · ')}</p>
      <h2 className="poreia-today__title">{dayText(day)}</h2>
      {entries.length ? (
        <ul className="poreia-agenda">
          {entries.map((entry, index) => (
            <li key={index}>
              <AgendaRow entry={entry} onOpen={() => openEntry(nav, trip.id, entry)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nothing set today.</p>
      )}
      <AddToDay tripId={trip.id} date={day} />
      <div className="poreia-today__actions">
        <button type="button" className="poreia-today__action" onClick={() => onView('bookings')}>
          <Sym name="ticket" size={20} />
          Bookings
        </button>
        <button type="button" className="poreia-today__action" onClick={() => onView('money')}>
          <Sym name="wallet" size={20} />
          Spending
        </button>
        <button type="button" className="poreia-today__action" onClick={() => onView('days')}>
          <Sym name="calendar" size={20} />
          All days
        </button>
      </div>
    </section>
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
          {needed === undefined ? 'Counting…' : needed.hours === 0 ? 'No work in these dates.' : `These dates take ${hoursText(needed.hours)} of time off.`}
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
      {linked.status === 'approved' && (linked.replaced?.length ?? 0) > 0 && <p className="muted">Shifts on these days are cleared in Proairetos.</p>}
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

/** The next thing on the trip, a tap from its details, with the rest of today under it while away. */
export function NextUpCard({ trip, nav, day, home = false }: { trip: Trip; nav: PoreiaNav; day: string; home?: boolean }) {
  const theirBookings = bookings.use().filter((each) => each.tripId === trip.id);
  const theirPlans = plans.use().filter((each) => each.tripId === trip.id);
  if (!trip.start) return null;
  const days = daysOf(trip, theirBookings, theirPlans);
  const clock = new Date();
  const now = `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`;
  const next = nextUp(days, day, now);
  const phase = phaseOf(trip, day);
  if (!next || phase.kind === 'past') return null;
  const later = next.date === day ? (days.find((each) => each.date === day)?.entries ?? []).filter((entry) => entry !== next.entry && (!entry.time || entry.time >= now) && (!entry.time || !next.entry.time || entry.time > next.entry.time)) : [];
  return (
    <section className="card poreia-next" data-ll-lit>
      <h2 className="card__title">
        {next.date === day ? 'Next today' : `Next: ${dayText(next.date)}`}
        {home && trip.place ? ` in ${trip.place.name}` : ''}
      </h2>
      <ul className="poreia-agenda">
        <li>
          <AgendaRow entry={next.entry} onOpen={() => openEntry(nav, trip.id, next.entry)} />
        </li>
        {later.slice(0, 4).map((entry, index) => (
          <li key={index}>
            <AgendaRow entry={entry} onOpen={() => openEntry(nav, trip.id, entry)} />
          </li>
        ))}
      </ul>
      {home && (
        <button type="button" className="text-link" onClick={() => nav.go({ name: 'trip', id: trip.id })}>
          Open the trip
        </button>
      )}
    </section>
  );
}
