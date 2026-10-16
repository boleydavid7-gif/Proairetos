import { WriteTag } from '../../app/family/DeviceExtras';
import { useEffect, useRef, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { KtemaNav } from '../app/App';
import { newId, putUpkeep, removeUpkeep, settings, things, upkeeps } from '../app/state';
import { useAddedApps } from '../../app/family/added';
import { Switch } from '../../askesis/app/ui';
import { cents } from '../../oikonomia/core/statements';
import { saveSpent, spentIn } from '../../oikonomia/data/spent';
import type { BudgetCategory } from '../../oikonomia/core/budget';
import { TimerIcon } from '../../app/family/icons';
import { dayText, everyText, latestReading, markDone, nextDue, skip, type Every, type Upkeep } from '../core/things';
import { Sym } from '../../lamplight/icons';

const UNITS: Every['unit'][] = ['days', 'weeks', 'months', 'years'];

function UpkeepForm({ existing, thingId, onDone }: { existing?: Upkeep; thingId?: string; onDone: () => void }) {
  const owned = things.use();
  const unit = settings.use().distance;
  const today = toLocalDate(new Date());
  const [name, setName] = useState(existing?.name ?? '');
  const [forThing, setForThing] = useState(existing?.thingId ?? thingId ?? '');
  const [count, setCount] = useState(existing?.every.count ?? 3);
  const [per, setPer] = useState<Every['unit']>(existing?.every.unit ?? 'months');
  const [distance, setDistance] = useState(existing?.distance ? String(existing.distance) : '');
  const [start, setStart] = useState(existing?.start ?? today);
  const [note, setNote] = useState(existing?.note ?? '');
  const nameField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!existing) nameField.current?.focus();
  }, []);

  const thing = owned.find((each) => each.id === forThing);
  const save = () => {
    const next: Upkeep = {
      ...(existing ?? { id: newId(), history: [], createdAt: new Date().toISOString() }),
      name: name.trim(),
      thingId: forThing || undefined,
      every: { count: Math.max(1, count), unit: per },
      distance: Number(distance) > 0 ? Number(distance) : undefined,
      start: existing?.history.length ? existing.start : start,
      note: note.trim() || undefined,
    };
    putUpkeep(next);
    if (existing) offerUndo('Saved', () => putUpkeep(existing));
    onDone();
  };

  return (
    <div className="page ktema-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={onDone}>Cancel</button>
        <p className="label">{existing ? 'Edit' : 'Add upkeep'}</p>
        <button type="button" className="text-link" disabled={!name.trim()} onClick={save}>Save</button>
      </div>

      <label className="field">
        <span className="field__label">What</span>
        <input ref={nameField} className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Air filter" />
      </label>
      <label className="field">
        <span className="field__label">For (optional)</span>
        <select className="input" value={forThing} onChange={(event) => setForThing(event.target.value)}>
          <option value="">The home in general</option>
          {[...owned].sort((a, b) => a.name.localeCompare(b.name)).map((each) => <option key={each.id} value={each.id}>{each.name}</option>)}
        </select>
      </label>
      <fieldset className="field">
        <legend className="field__label">Comes around</legend>
        <div className="stepper">
          <button type="button" className="stepper__button" aria-label="Fewer" onClick={() => setCount(Math.max(1, count - 1))}><Sym name="minus" /></button>
          <span className="stepper__value">Every {count}</span>
          <button type="button" className="stepper__button" aria-label="More" onClick={() => setCount(Math.min(60, count + 1))}><Sym name="plus" /></button>
        </div>
        <div className="chip-row" role="group" aria-label="Unit">
          {UNITS.map((each) => <button key={each} type="button" className="chip" aria-pressed={per === each} onClick={() => setPer(each)}>{count === 1 ? each.slice(0, -1) : each}</button>)}
        </div>
      </fieldset>
      {(thing?.category === 'Car' || distance) && (
        <label className="field">
          <span className="field__label">{`Or every this many ${unit} (optional)`}</span>
          <input className="input" inputMode="numeric" value={distance} onChange={(event) => setDistance(event.target.value.replace(/\D/g, ''))} placeholder="5000" />
        </label>
      )}
      {!existing?.history.length && (
        <label className="field">
          <span className="field__label">First time</span>
          <input className="input" type="date" value={start} onChange={(event) => setStart(event.target.value || today)} />
        </label>
      )}
      <label className="field"><span className="field__label">Note (optional)</span><input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Filter size, part number" /></label>

      <button type="button" className="button-main" disabled={!name.trim()} onClick={save}>Save</button>

    </div>
  );
}

function UpkeepView({ nav, upkeep: existing, onEdit }: { nav: KtemaNav; upkeep: Upkeep; onEdit: () => void }) {
  const owned = things.use();
  const unit = settings.use().distance;
  const today = toLocalDate(new Date());
  const [reading, setReading] = useState('');
  const [cost, setCost] = useState('');
  const oikonomia = useAddedApps().includes('oikonomia');
  const [toSpent, setToSpent] = useState(true);
  const thing = owned.find((each) => each.id === existing.thingId);
  const due = nextDue(existing, thing);
  const latest = latestReading(thing);

  return (
    <div className="page ktema-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">Upkeep</p>
        <button type="button" className="text-link" onClick={onEdit}>Edit</button>
      </div>

      <div className="detail-head">
        <span className="detail-head__mark"><TimerIcon size={32} /></span>
        <div>
          <h1 className="title">{existing.name}</h1>
          <p className="muted">{thing ? <button type="button" className="text-link" onClick={() => nav.go({ name: 'thing', id: thing.id })}>{thing.name}</button> : 'The home in general'}</p>
        </div>
      </div>

      <section className="card">
        <span className="card__eyebrow">{dayText(due.date, today)}{due.reading !== undefined ? ` · or at ${due.reading.toLocaleString()} ${unit}` : ''}</span>
        <div className="input-row">
          {existing.distance ? (
            <label className="field">
              <span className="field__label">Reading (optional)</span>
              <input className="input" inputMode="numeric" value={reading} placeholder={latest ? latest.value.toLocaleString() : unit} onChange={(event) => setReading(event.target.value)} />
            </label>
          ) : null}
          <label className="field">
            <span className="field__label">Cost (optional)</span>
            <input className="input" value={cost} onChange={(event) => setCost(event.target.value)} />
          </label>
        </div>
        {oikonomia && cost.trim() && (
          <Switch on={toSpent} label="Also in Oikonomia’s Spent" onToggle={() => setToSpent(!toSpent)} />
        )}
        <div className="button-row">
          <button type="button" className="button-main" onClick={() => {
            const value = Number(reading.replace(/[^\d.]/g, '')) || (existing.distance ? latest?.value : undefined);
            putUpkeep(markDone(existing, today, { ...(value ? { reading: value } : {}), ...(cost.trim() ? { cost: cost.trim() } : {}) }));
            // The cost can go into Oikonomia's Spent for the month, in the area that fits the thing.
            const amount = cents(cost);
            const month = today.slice(0, 7);
            const spentBefore = spentIn(month);
            const sent = oikonomia && toSpent && amount !== undefined && amount > 0;
            if (sent) {
              const area: BudgetCategory = thing?.category === 'Car' ? 'transport' : thing?.category === 'Tech' || thing?.category === 'Documents' ? 'other' : 'housing';
              saveSpent(month, [...spentBefore, { id: newId(), date: today, description: [existing.name, thing?.name].filter(Boolean).join(' · '), amountCents: Math.abs(amount), area }]);
            }
            offerUndo(sent ? `${existing.name} done, cost in Oikonomia` : `${existing.name} done`, () => {
              putUpkeep(existing);
              if (sent) saveSpent(month, spentBefore);
            });
            nav.back();
          }}>Done</button>
          {due.date <= today && (
            <button type="button" className="button-quiet" onClick={() => {
              putUpkeep(skip(existing, today));
              offerUndo(`${existing.name} skipped`, () => putUpkeep(existing));
              nav.back();
            }}>Skip this time</button>
          )}
        </div>
      </section>


      <WriteTag path={`/ktema/?open=upkeep:${existing.id}`} />
      <dl className="detail-list">
        <dt>Comes around</dt><dd>{[everyText(existing.every), existing.distance ? `or every ${existing.distance.toLocaleString()} ${unit}` : undefined].filter(Boolean).join(', ')}</dd>
        {existing.note && <><dt>Note</dt><dd>{existing.note}</dd></>}
      </dl>

      {existing.history.length > 0 && (
        <section className="card">
          <h2 className="card__title card__title--small">Done</h2>
          <ul className="notes-list">
            {[...existing.history].reverse().slice(0, 10).map((each, index) => (
              <li key={`${each.date}-${index}`} className="note-line">
                <span>{new Date(`${each.date}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="muted">{each.skipped ? 'Skipped' : [each.reading !== undefined ? `${each.reading.toLocaleString()} ${unit}` : undefined, each.cost].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className="text-link remove-link" onClick={() => {
        removeUpkeep(existing.id);
        offerUndo(`${existing.name} removed`, () => putUpkeep(existing));
        nav.back();
      }}>Remove</button>
    </div>
  );
}

export default function UpkeepPage({ nav, id, thingId }: { nav: KtemaNav; id?: string; thingId?: string; idea?: string }) {
  const existing = upkeeps.use().find((upkeep) => upkeep.id === id);
  const [editing, setEditing] = useState(!id);
  if (id && !existing) {
    return (
      <div className="page ktema-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Not found on this device.</p>
      </div>
    );
  }
  if (existing && !editing) return <UpkeepView nav={nav} upkeep={existing} onEdit={() => setEditing(true)} />;
  return <UpkeepForm key={existing?.id ?? 'new'} existing={existing} thingId={thingId} onDone={() => (existing ? setEditing(false) : nav.back())} />;
}
