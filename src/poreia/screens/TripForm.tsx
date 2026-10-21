import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { BackLink, Segmented } from '../../askesis/app/ui';
import type { PoreiaNav } from '../app/App';
import { newId, nowStamp, removeTrip, settings, trips } from '../app/state';
import { MoneyField, PlaceSearch } from '../app/ui';
import type { Place, Trip, TripStage } from '../core/model';

const STAGES: { id: TripStage; label: string }[] = [
  { id: 'idea', label: 'Idea' },
  { id: 'planning', label: 'Planning' },
  { id: 'booked', label: 'Booked' },
];

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
  const [stage, setStage] = useState<TripStage>(existing?.stage ?? 'idea');
  const [budget, setBudget] = useState<{ cents?: number; currency: string }>({ cents: existing?.budget?.cents, currency: existing?.budget?.currency ?? prefs.currency });
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const title = name.trim() || place?.name || '';

  const save = () => {
    if (!title) return;
    const now = nowStamp();
    const trip: Trip = {
      id: existing?.id ?? newId(),
      name: title,
      place,
      from,
      start: start || undefined,
      end: start && end && end >= start ? end : start || undefined,
      travelers: Math.max(1, travelers),
      stage,
      budget: budget.cents ? { cents: budget.cents, currency: budget.currency || prefs.currency } : undefined,
      notes: notes.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    trips.put(trip);
    if (existing) nav.back();
    else nav.swap({ name: 'trip', id: trip.id });
  };

  return (
    <div className="page poreia-page">
      <BackLink label={existing ? existing.name : 'Trips'} onBack={nav.back} />
      <h1 className="title">{existing ? 'Edit trip' : 'New trip'}</h1>

      <PlaceSearch label="Where" value={place} onPick={setPlace} />
      <label className="field">
        <span className="field__label">Name (optional)</span>
        <input className="input" value={name} placeholder={place?.name ?? 'Summer by the sea'} onChange={(event) => setName(event.target.value)} />
      </label>

      <div className="input-row">
        <label className="field">
          <span className="field__label">From</span>
          <input className="input" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Until</span>
          <input className="input" type="date" value={end} min={start || undefined} onChange={(event) => setEnd(event.target.value)} />
        </label>
      </div>

      <label className="field">
        <span className="field__label">Travelers</span>
        <input className="input" type="number" min={1} max={20} value={travelers} onChange={(event) => setTravelers(Number(event.target.value) || 1)} />
      </label>

      <Segmented label="Where it stands" value={stage} options={STAGES} onChange={setStage} />

      <PlaceSearch label={`Starting from (optional${prefs.home ? `, else ${prefs.home.name}` : ''})`} value={from} onPick={setFrom} />
      <MoneyField label="Budget (optional)" cents={budget.cents} currency={budget.currency} onChange={(cents, currency) => setBudget({ cents, currency })} />
      <label className="field">
        <span className="field__label">Notes (optional)</span>
        <textarea className="input area" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>

      <button type="button" className="button-main" disabled={!title} onClick={save}>
        Save
      </button>
      {existing && (
        <button
          type="button"
          className="text-link remove-link"
          onClick={() => {
            const undo = removeTrip(existing);
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
