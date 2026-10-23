import { useEffect, useState, type CSSProperties } from 'react';
import { Sym, type GlyphName } from '../../lamplight/icons';
import { offerUndo } from '../../app/family/shell';
import { BackLink } from '../../askesis/app/ui';
import { transition } from '../../app/transitions';
import type { PoreiaNav } from '../app/App';
import { countHours, saveTimeOff, setStatus } from '../app/proairetos';
import { bookings, newId, nowStamp, plans, settings, spots, timeOff, today, trips } from '../app/state';
import { datesText, dayText } from '../app/ui';
import { daysOf, nextUp, nightsOf, phaseOf, phaseText, placesOf, STAGE_TEXT, stageOf, stopNow, stopOn, type Trip } from '../core/model';
import { hoursText, leftAfter, STATUS_LABEL, type TimeOff } from '../core/timeOff';
import { BookLinks, CountryCard, EventsCard, GuideCard, Weather, type Target } from '../components/Destination';
import TripBookings from '../components/TripBookings';
import TripDays, { AddToDay, AgendaRow, DaySky, openEntry, useDayWeather } from '../components/TripDays';
import TripPacking from '../components/TripPacking';
import TripMoney from '../components/TripMoney';
import Around from '../components/Around';
import TimeThere from '../components/TimeThere';
import OfflineCard from '../components/OfflineCard';
import TripWithApps from '../components/TripWithApps';
import { TogetherCard } from '../components/Together';
import { ArrivingCard, DocumentsCard } from '../components/Arriving';
import { GoalCard, useEnvelopeSync } from '../components/TripGoals';
import { TripScene } from '../components/TripScene';
import WhenToGo from '../components/WhenToGo';
import { useLocatedTrip } from '../app/locate';
import RouteEmpty from '../components/RouteEmpty';
import { HolidaysLine } from '../components/References';
import { TripFlights } from '../components/FlightNow';
import { RouteCard } from '../components/RouteCard';
import { EmbassyCard, PhrasesCard } from '../components/PlaceExtras';
import type { Holiday } from '../app/world';

export type TripView = 'overview' | 'around' | 'bookings' | 'days' | 'packing' | 'money';

const VIEWS: { id: TripView; label: string; glyph: GlyphName }[] = [
  { id: 'overview', label: 'Overview', glyph: 'home' },
  { id: 'days', label: 'Days', glyph: 'calendar' },
  { id: 'bookings', label: 'Bookings', glyph: 'ticket' },
  { id: 'around', label: 'Around', glyph: 'pin' },
  { id: 'packing', label: 'Packing', glyph: 'suitcase' },
  { id: 'money', label: 'Money', glyph: 'wallet' },
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
  useLocatedTrip(trip);
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
  // With several stops, the place cards follow the chosen stop and its dates.
  const target: Target | undefined = stop ? { place: stop.place, from: trip.from, start: stop.start ?? trip.start, end: stop.end ?? trip.end, travelers: trip.travelers } : undefined;
  const addToDays = (title: string, date?: string, where?: string, extra: { time?: string; lat?: number; lon?: number; url?: string } = {}) => {
    const item = { id: newId(), tripId: trip.id, date: date && trip.start && date >= trip.start && date <= (trip.end ?? trip.start) ? date : trip.start ?? day, title, where, ...extra, createdAt: nowStamp(), updatedAt: nowStamp() };
    plans.put(item);
    offerUndo(`“${title}” added to the days`, () => plans.remove(item.id));
  };
  const pick = (next: TripView) => transition(VIEWS.findIndex((each) => each.id === next) < VIEWS.findIndex((each) => each.id === view) ? 'back' : 'forward', () => setView(next), 'panel');

  return (
    <div className="page poreia-page poreia-trip">
      <TripScene trip={trip} place={target?.place} />
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

      {stops.length > 1 && (view === 'overview' || view === 'around' || view === 'bookings') && (
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
        {view === 'overview' && <Overview trip={trip} target={target} nav={nav} day={day} onView={pick} />}
        {view === 'around' &&
          (stop?.place.lat !== undefined ? (
            <>
              <Around key={stop.id} place={stop.place} tripId={trip.id} start={stop.start} end={stop.end} nav={nav} />
              {target && phase.kind !== 'past' && <EventsCard target={target} onAdd={(event) => addToDays(event.name, event.date, event.venue, { time: event.time, lat: event.lat, lon: event.lon, url: event.url })} />}
            </>
          ) : (
            <RouteEmpty glyph="pin" title="No place yet">
              <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'trip-form', id: trip.id })}>
                Add a place
              </button>
            </RouteEmpty>
          ))}
        {view === 'bookings' && (
          <>
            <TripBookings trip={trip} nav={nav} />
            {target && phase.kind !== 'past' && <BookLinks target={target} nav={nav} tripId={trip.id} />}
          </>
        )}
        {view === 'days' && <TripDays trip={trip} nav={nav} />}
        {view === 'packing' && <TripPacking trip={trip} />}
        {view === 'money' && <TripMoney trip={trip} />}
      </div>
    </div>
  );
}

function Overview({ trip, target, nav, day, onView }: { trip: Trip; target?: Target; nav: PoreiaNav; day: string; onView: (view: TripView) => void }) {
  const phase = phaseOf(trip, day);
  const ahead = phase.kind !== 'past';
  const about = (
    <>
      {target && (
        <>
          <Weather target={target} today={day} />
          {ahead && <WhenToGo place={target.place} start={target.start} end={target.end} />}
          <SavedCard trip={trip} nav={nav} />
          <GuideCard place={target.place} />
          <CountryCard target={target}>
            {ahead && <ArrivingCard place={target.place} />}
            <PhrasesCard place={target.place} />
            <EmbassyCard place={target.place} />
          </CountryCard>
        </>
      )}
      {ahead && <DocumentsCard trip={trip} nav={nav} />}
      {ahead && <TripWithApps trip={trip} />}
      {ahead && target && <OfflineCard trip={trip} />}
      <GoalCard trip={trip} />
      <TogetherCard trip={trip} />
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
        <TripFlights trip={trip} />
        <TimeThere trip={trip} place={target?.place} today={day} />
        <details className="poreia-fold poreia-more">
          <summary>More about this trip</summary>
          {about}
        </details>
      </>
    );
  }
  return (
    <>
      <NextUpCard trip={trip} nav={nav} day={day} />
      <TripFlights trip={trip} />
      <RouteCard trip={trip} />
      <TimeThere trip={trip} place={target?.place} today={day} />
      <TimeOffCard trip={trip} nav={nav} />
      {!target && (
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

/** A day of a trip under way: where, the sky, what is set, and the next steps a tap away. */
function TodayCard({ trip, nav, day, onView }: { trip: Trip; nav: PoreiaNav; day: string; onView: (view: TripView) => void }) {
  const theirBookings = bookings.use().filter((each) => each.tripId === trip.id);
  const theirPlans = plans.use().filter((each) => each.tripId === trip.id);
  const unit = settings.use().temperature;
  const weather = useDayWeather(trip);
  const phase = phaseOf(trip, day);
  const entries = daysOf(trip, theirBookings, theirPlans).find((each) => each.date === day)?.entries ?? [];
  const where = stopOn(trip, day)?.place.name ?? trip.place?.name;
  const sky = weather.get(day);
  return (
    <section className="card poreia-today">
      <p className="poreia-today__eyebrow">{[phase.kind === 'now' ? `Day ${phase.day} of ${phase.of}` : undefined, where].filter(Boolean).join(' · ')}</p>
      <h2 className="poreia-today__title">{dayText(day)}</h2>
      {sky && <DaySky day={sky} unit={unit} />}
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
        <button type="button" className="poreia-today__action" onClick={() => onView('around')}>
          <Sym name="pin" size={20} />
          Around me
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
  const [needed, setNeeded] = useState<{ hours: number; hasSchedule: boolean; holidays: Holiday[] }>();
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
        {needed && needed.holidays.length > 0 && <HolidaysLine days={needed.holidays} />}
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

/** What this trip kept from the map, the guide, events and stays; each opens its page. */
function SavedCard({ trip, nav }: { trip: Trip; nav: PoreiaNav }) {
  const kept = spots.use().filter((each) => each.tripId === trip.id);
  if (!kept.length) return null;
  return (
    <section className="card">
      <h2 className="card__title">Saved places</h2>
      <ul className="rows poreia-spots">
        {kept.slice(0, 8).map((spot) => (
          <li key={spot.id}>
            <button type="button" className="row" onClick={() => nav.go({ name: 'place', spot, tripId: trip.id })}>
              {spot.image ? <img className="poreia-spots__photo" src={spot.image} alt="" /> : <span className={`poreia-spots__dot poreia-pin--${spot.category}`} aria-hidden="true" />}
              <span className="row__text">
                <span>{spot.name}</span>
                <span className="row__detail">{[spot.kind, spot.price].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="text-link" onClick={() => nav.go({ name: 'trip', id: trip.id, view: 'around' })}>
        See them on the map
      </button>
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
    <section className="card poreia-next">
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
