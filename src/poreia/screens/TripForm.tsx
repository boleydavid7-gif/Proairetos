import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { isAdded } from '../../app/family/added';
import { BackLink } from '../../askesis/app/ui';
import type { PoreiaNav } from '../app/App';
import { newId, nowStamp, removeTrip, settings, trips } from '../app/state';
import { MoneyField, PlaceSearch } from '../app/ui';
import { withStops, type Place, type Stop, type Trip } from '../core/model';
import DateRange from '../components/DateRange';
import MoreDetails from '../../app/family/MoreDetails';
import { TimeOffLine, YearBudgetLine } from '../components/References';

type StopDraft = { id: string; place?: Place; start: string; end: string };

/** A new trip, or the details of one: name, where, when, who, money. */
export default function TripForm({ nav, id, draft }: { nav: PoreiaNav; id?: string; draft?: { name?: string; place?: string } }) {
  const existing = id ? trips.get(id) : undefined;
  const prefs = settings.load();
  const [name, setName] = useState(existing?.name ?? draft?.name ?? '');
  const [place, setPlace] = useState<Place | undefined>(existing?.place ?? (draft?.place ? { name: draft.place.split(',')[0], label: draft.place } : undefined));
  const [from, setFrom] = useState<Place | undefined>(existing?.from);
  const [start, setStart] = useState(existing?.start ?? '');
  const [end, setEnd] = useState(existing?.end ?? '');
  const [travelers, setTravelers] = useState(existing?.travelers ?? prefs.travelers);
  const [budget, setBudget] = useState<{ cents?: number; currency: string }>({ cents: existing?.budget?.cents, currency: existing?.budget?.currency ?? prefs.currency });
  const [notes, setNotes] = useState(existing?.notes ?? '');
  // Two or more stops replace the one place and the trip's own dates.
  const [stops, setStops] = useState<StopDraft[]>(() => (existing?.stops ?? []).map((stop) => ({ id: stop.id, place: stop.place, start: stop.start ?? '', end: stop.end ?? '' })));
  const several = stops.length >= 2;
  const changeStop = (index: number, patch: Partial<StopDraft>) => setStops((list) => list.map((stop, at) => (at === index ? { ...stop, ...patch } : stop)));
  const addStop = () =>
    setStops((list) => {
      const base = list.length ? list : [{ id: newId(), place, start, end }];
      const last = base[base.length - 1];
      return [...base, { id: newId(), start: last.end || last.start, end: '' }];
    });
  const removeStop = (index: number) =>
    setStops((list) => {
      const next = list.filter((_, at) => at !== index);
      if (next.length === 1) {
        setPlace(next[0].place);
        setStart(next[0].start);
        setEnd(next[0].end);
        return [];
      }
      return next;
    });
  // The whole stretch away, for the time off it takes and the year it counts in.
  const dated = several ? stops.filter((stop) => stop.start) : [];
  const spanStart = several ? dated.map((stop) => stop.start).sort()[0] : start || undefined;
  const spanEnd = several ? dated.map((stop) => stop.end || stop.start).sort().at(-1) : end || start || undefined;
  const year = Number((spanStart ?? new Date().toISOString()).slice(0, 4));
  const title = name.trim() || (several ? stops.map((stop) => stop.place?.name).filter(Boolean).join(' and ') : place?.name) || '';

  const save = () => {
    if (!title) return;
    const now = nowStamp();
    const base: Trip = {
      id: existing?.id ?? newId(),
      name: title,
      place,
      from,
      start: start || undefined,
      end: start && end && end >= start ? end : start || undefined,
      travelers: (existing?.people?.length ?? 0) > 1 ? existing!.people!.length : Math.max(1, travelers),
      // Where it stands is read from its dates and bookings (`stageOf`); the field stays for older records.
      stage: existing?.stage ?? 'idea',
      budget: budget.cents ? { cents: budget.cents, currency: budget.currency || prefs.currency } : undefined,
      notes: notes.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const trip = withStops(
      base,
      several ? stops.filter((stop): stop is StopDraft & { place: Place } => Boolean(stop.place)).map((stop): Stop => ({ id: stop.id, place: stop.place, start: stop.start || undefined, end: stop.end && stop.start && stop.end >= stop.start ? stop.end : stop.start || undefined })) : [],
    );
    trips.put(trip);
    // Setting a trip budget creates or updates its matching Oikonomia travel envelope immediately.
    if (isAdded('oikonomia')) void import('../app/goalsAndSaving').then((apps) => apps.syncEnvelope(trip, prefs.currency)).catch(() => undefined);
    if (existing) nav.back();
    else nav.swap({ name: 'trip', id: trip.id });
  };

  return (
    <div className="page poreia-page">
      <BackLink label={existing ? existing.name : 'Trips'} onBack={nav.back} />
      <h1 className="title">{existing ? 'Edit trip' : 'New trip'}</h1>

      {several ? (
        <section className="poreia-stops" aria-label="Stops">
          {stops.map((stop, index) => (
            <div key={stop.id} className="poreia-stop">
              <div className="section-head">
                <p className="label">Stop {index + 1}</p>
                <button type="button" className="text-link" onClick={() => removeStop(index)}>
                  Remove
                </button>
              </div>
              <PlaceSearch label="Where" value={stop.place} onPick={(picked) => changeStop(index, { place: picked })} />
              <DateRange start={stop.start || undefined} end={stop.end || undefined} empty="Pick a day" clearable={false} onChange={(dates) => changeStop(index, { start: dates.start ?? '', end: dates.end ?? '' })} />
            </div>
          ))}
          <TimeOffLine start={spanStart} end={spanEnd} tripId={existing?.id} />
          <button type="button" className="button-quiet" onClick={addStop}>
            Add another stop
          </button>
        </section>
      ) : (
        <>
          <PlaceSearch label="Where" value={place} onPick={setPlace} />
          <button type="button" className="text-link" onClick={addStop}>
            Add another stop
          </button>
        </>
      )}
      <label className="field">
        <span className="field__label">Name</span>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
      </label>

      {!several && (
        <DateRange
          start={start || undefined}
          end={end || undefined}
          empty="No date yet"
          onChange={(dates) => {
            setStart(dates.start ?? '');
            setEnd(dates.end ?? '');
          }}
        />
      )}
      {!several && <TimeOffLine start={spanStart} end={spanEnd} tripId={existing?.id} />}

      <section className="card poreia-trip-form__budget">
        <div className="section-head">
          <div>
            <p className="label">Money for the trip</p>
            <h2 className="card__title">Travel budget</h2>
          </div>
        </div>
        <MoneyField label="Total budget" cents={budget.cents} currency={budget.currency} onChange={(cents, currency) => setBudget({ cents, currency })} />
        <YearBudgetLine year={year} except={existing?.id ?? ''} adding={budget.cents ? { cents: budget.cents, currency: budget.currency || prefs.currency } : undefined} />
      </section>

      <MoreDetails open={Boolean(existing)}>
      {(existing?.people?.length ?? 0) > 1 ? (
        <p className="muted">
          {existing!.people!.length} travelers: {existing!.people!.join(', ')}
        </p>
      ) : (
        <label className="field">
          <span className="field__label">Travelers</span>
          <input className="input" type="number" min={1} max={20} value={travelers} onChange={(event) => setTravelers(Number(event.target.value) || 1)} />
        </label>
      )}

      <PlaceSearch label="Starting from" value={from} onPick={setFrom} />
      <label className="field">
        <span className="field__label">Notes</span>
        <textarea className="input area" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      </MoreDetails>

      <button type="button" className="button-main" disabled={!title} onClick={save}>
        Save
      </button>
      {existing && (
        <button
          type="button"
          className="text-link remove-link"
          onClick={async () => {
            const undo = removeTrip({ ...existing, sharedList: undefined });
            offerUndo(`“${existing.name}” deleted`, undo);
            nav.swap({ name: 'trips' });
          }}
        >
          Delete trip
        </button>
      )}
    </div>
  );
}
