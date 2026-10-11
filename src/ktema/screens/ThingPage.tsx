import { useEffect, useRef, useState } from 'react';
import { offerUndo, say } from '../../app/family/shell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { KtemaNav } from '../app/App';
import { newId, putThing, removeThing, settings, things, upkeeps } from '../app/state';
import { UpkeepRow } from '../app/ui';
import ThingFiles from './ThingFiles';
import { CATEGORIES, latestReading, nextDue, warrantyFrom, type Category, type Thing } from '../core/things';

export default function ThingPage({ nav, id }: { nav: KtemaNav; id?: string }) {
  const all = things.use();
  const list = upkeeps.use();
  const unit = settings.use().distance;
  const existing = id ? all.find((thing) => thing.id === id) : undefined;
  const today = toLocalDate(new Date());
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'Appliance');
  const [place, setPlace] = useState(existing?.place ?? '');
  const [make, setMake] = useState(existing?.make ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [serial, setSerial] = useState(existing?.serial ?? '');
  const [boughtOn, setBoughtOn] = useState(existing?.boughtOn ?? '');
  const [price, setPrice] = useState(existing?.price ?? '');
  const [store, setStore] = useState(existing?.store ?? '');
  const [warranty, setWarranty] = useState(existing?.warrantyUntil ?? '');
  const [link, setLink] = useState(existing?.link ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [reading, setReading] = useState('');
  const nameField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!id) nameField.current?.focus();
  }, []);

  if (id && !existing) {
    return (
      <div className="page ktema-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Not found on this phone.</p>
      </div>
    );
  }

  const build = (): Thing => ({
    ...(existing ?? { id: newId(), createdAt: new Date().toISOString() }),
    name: name.trim(),
    category,
    place: place.trim() || undefined,
    make: make.trim() || undefined,
    model: model.trim() || undefined,
    serial: serial.trim() || undefined,
    boughtOn: boughtOn || undefined,
    price: price.trim() || undefined,
    store: store.trim() || undefined,
    warrantyUntil: warranty || undefined,
    link: link.trim() || undefined,
    note: note.trim() || undefined,
  });
  const save = () => {
    putThing(build());
    if (existing) offerUndo('Saved', () => putThing(existing));
    nav.back();
  };
  const its = existing ? list.filter((upkeep) => upkeep.thingId === existing.id) : [];
  const latest = latestReading(existing);
  const safeLink = /^https?:\/\//i.test(link.trim()) ? link.trim() : undefined;

  return (
    <div className="page ktema-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Cancel</button>
        <p className="label">{existing ? 'Thing' : 'Add a thing'}</p>
        <button type="button" className="text-link" disabled={!name.trim()} onClick={save}>Save</button>
      </div>

      <label className="field">
        <span className="field__label">Name</span>
        <input ref={nameField} className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder={category === 'Documents' ? 'Passport, car insurance' : 'Dishwasher'} />
      </label>
      <fieldset className="field">
        <legend className="field__label">Kind</legend>
        <div className="chip-row" role="group" aria-label="Kind">
          {CATEGORIES.map((each) => <button key={each} type="button" className="chip" aria-pressed={category === each} onClick={() => setCategory(each)}>{each}</button>)}
        </div>
      </fieldset>
      <label className="field">
        <span className="field__label">Where (optional)</span>
        <input className="input" value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Kitchen, garage" />
      </label>
      <div className="input-row">
        <label className="field"><span className="field__label">Make (optional)</span><input className="input" value={make} onChange={(event) => setMake(event.target.value)} /></label>
        <label className="field"><span className="field__label">Model (optional)</span><input className="input" value={model} onChange={(event) => setModel(event.target.value)} /></label>
      </div>
      <label className="field">
        <span className="field__label">Serial number (optional)</span>
        <div className="add-line">
          <input className="input" value={serial} onChange={(event) => setSerial(event.target.value)} autoCapitalize="characters" spellCheck={false} />
          {serial.trim() && <button type="button" className="button-quiet" onClick={() => void navigator.clipboard?.writeText(serial.trim()).then(() => say('Copied'), () => undefined)}>Copy</button>}
        </div>
      </label>
      <div className="input-row">
        <label className="field"><span className="field__label">Bought (optional)</span><input className="input" type="date" value={boughtOn} onChange={(event) => setBoughtOn(event.target.value)} /></label>
        <label className="field"><span className="field__label">Price (optional)</span><input className="input" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
      </div>
      <label className="field"><span className="field__label">Where from (optional)</span><input className="input" value={store} onChange={(event) => setStore(event.target.value)} /></label>
      <label className="field">
        <span className="field__label">{category === 'Documents' ? 'Renews or ends (optional)' : 'Warranty until (optional)'}</span>
        <input className="input" type="date" value={warranty} onChange={(event) => setWarranty(event.target.value)} />
      </label>
      {boughtOn && (
        <div className="chip-row" aria-label="Warranty length">
          {[1, 2, 3, 5].map((years) => <button key={years} type="button" className="chip" aria-pressed={warranty === warrantyFrom(boughtOn, years)} onClick={() => setWarranty(warrantyFrom(boughtOn, years))}>{years} {years === 1 ? 'year' : 'years'}</button>)}
        </div>
      )}
      <label className="field">
        <span className="field__label">Manual or receipt link (optional)</span>
        <div className="add-line">
          <input className="input" type="url" inputMode="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://" />
          {safeLink && <a className="button-quiet" href={safeLink} target="_blank" rel="noreferrer noopener">Open</a>}
        </div>
      </label>
      <label className="field"><span className="field__label">Note (optional)</span><input className="input" value={note} onChange={(event) => setNote(event.target.value)} /></label>

      <button type="button" className="button-main" disabled={!name.trim()} onClick={save}>Save</button>

      {existing && <ThingFiles thingId={existing.id} />}

      {existing && (existing.category === 'Car' || existing.readings?.length) && (
        <section className="card">
          <h2 className="card__title card__title--small">Odometer</h2>
          {latest && <p className="muted">{latest.value.toLocaleString()} {unit} · {new Date(`${latest.date}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
          <form className="add-line" onSubmit={(event) => {
            event.preventDefault();
            const value = Number(reading.replace(/[^\d.]/g, ''));
            if (!(value > 0)) return;
            putThing({ ...existing, readings: [...(existing.readings ?? []).filter((each) => each.date !== today), { date: today, value }] });
            offerUndo('Reading kept', () => putThing(existing));
            setReading('');
          }}>
            <input className="input" inputMode="numeric" aria-label={`Reading in ${unit}`} placeholder={`Reading today, ${unit}`} value={reading} onChange={(event) => setReading(event.target.value)} />
            <button type="submit" className="button-quiet" disabled={!reading.trim()}>Keep</button>
          </form>
        </section>
      )}

      {existing && (
        <section>
          <div className="section-head">
            <h2>Upkeep</h2>
            <button type="button" className="text-link" onClick={() => nav.go({ name: 'upkeep', thingId: existing.id })}>Add</button>
          </div>
          {its.length ? (
            <ul className="chore-list">{its.map((upkeep) => <UpkeepRow key={upkeep.id} upkeep={upkeep} due={nextDue(upkeep, existing)} thing={existing} today={today} onOpen={() => nav.go({ name: 'upkeep', id: upkeep.id })} />)}</ul>
          ) : (
            <p className="muted">None for this.</p>
          )}
        </section>
      )}

      {existing && (
        <button type="button" className="text-link remove-link" onClick={() => {
          const putBack = removeThing(existing);
          offerUndo(`${existing.name} removed`, putBack);
          nav.back();
        }}>Remove</button>
      )}
    </div>
  );
}
