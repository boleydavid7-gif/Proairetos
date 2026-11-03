import { useState } from 'react';
import type { Nav } from '../app/App';
import { newId, useEntries, useSettings, useToday } from '../app/state';
import { useShoes, saveShoes } from '../app/shoes';
import { BackLink, useUndo } from '../app/ui';
import { defaultShoe, shoeMileage, shoeProgress, shoeRunEntries, type Shoe } from '../core/shoes';
import { formatDistance, parseDistance } from '../core/pace';

export default function ShoesPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const today = useToday();
  const entries = useEntries() ?? [];
  const shoes = useShoes();
  const undo = useUndo();
  const unit = settings.unit;
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [starting, setStarting] = useState('');
  const [target, setTarget] = useState('');
  const [problem, setProblem] = useState('');

  const active = shoes.filter((shoe) => !shoe.retiredOn);
  const retired = shoes.filter((shoe) => Boolean(shoe.retiredOn));
  const defaultId = defaultShoe(shoes)?.id;

  const openNew = () => {
    setEditingId(undefined);
    setName('');
    setStarting('');
    setTarget('');
    setProblem('');
    setFormOpen(true);
  };

  const openEdit = (shoe: Shoe) => {
    setEditingId(shoe.id);
    setName(shoe.name);
    setStarting(shoe.startingMeters ? String(Number((shoe.startingMeters / (unit === 'mi' ? 1609.344 : 1000)).toFixed(1))) : '');
    setTarget(shoe.targetMeters ? String(Number((shoe.targetMeters / (unit === 'mi' ? 1609.344 : 1000)).toFixed(1))) : '');
    setProblem('');
    setFormOpen(true);
  };

  const chooseDefault = (id: string) => {
    saveShoes(shoes.map((shoe) => ({ ...shoe, isDefault: shoe.id === id && !shoe.retiredOn })));
  };

  const save = () => {
    const label = name.trim();
    if (!label) {
      setProblem('Give this pair a name.');
      return;
    }
    const startingMeters = starting.trim() ? parseDistance(starting, unit) : 0;
    const targetMeters = target.trim() ? parseDistance(target, unit) : undefined;
    if (starting.trim() && !startingMeters) {
      setProblem('Enter a valid starting mileage.');
      return;
    }
    if (target.trim() && !targetMeters) {
      setProblem('Enter a valid reminder mileage.');
      return;
    }
    const before = shoes;
    const existing = editingId ? shoes.find((shoe) => shoe.id === editingId) : undefined;
    const nextShoe: Shoe = {
      id: existing?.id ?? `shoe-${newId()}`,
      name: label,
      startedOn: existing?.startedOn ?? today,
      startingMeters: startingMeters ?? 0,
      targetMeters,
      retiredOn: existing?.retiredOn,
      isDefault: existing?.isDefault ?? (!defaultId && active.length === 0),
    };
    let next = existing
      ? shoes.map((shoe) => shoe.id === existing.id ? nextShoe : shoe)
      : [...shoes, nextShoe];
    if (!defaultShoe(next)) {
      const firstActive = next.find((shoe) => !shoe.retiredOn);
      if (firstActive) next = next.map((shoe) => ({ ...shoe, isDefault: shoe.id === firstActive.id }));
    }
    saveShoes(next);
    setFormOpen(false);
    setEditingId(undefined);
    undo(existing ? 'Shoe updated' : 'Shoe added', () => saveShoes(before));
  };

  const retire = (shoe: Shoe) => {
    const before = shoes;
    let next = shoes.map((each) => each.id === shoe.id ? { ...each, retiredOn: today, isDefault: false } : each);
    if (shoe.isDefault) {
      const replacement = next.find((each) => !each.retiredOn);
      if (replacement) next = next.map((each) => ({ ...each, isDefault: each.id === replacement.id }));
    }
    saveShoes(next);
    undo('Shoe retired', () => saveShoes(before));
  };

  const restoreShoe = (shoe: Shoe) => {
    const before = shoes;
    let next = shoes.map((each) => each.id === shoe.id ? { ...each, retiredOn: undefined, isDefault: false } : each);
    if (!defaultShoe(next)) next = next.map((each) => ({ ...each, isDefault: each.id === shoe.id }));
    saveShoes(next);
    undo('Shoe restored', () => saveShoes(before));
  };

  const shoeCard = (shoe: Shoe, isRetired = false) => {
    const mileage = shoeMileage(shoe, entries);
    const runs = shoeRunEntries(shoe, entries).length;
    const progress = shoeProgress(shoe, entries);
    const remaining = shoe.targetMeters ? Math.max(0, shoe.targetMeters - mileage) : undefined;
    return (
      <section className="card shoe-card" key={shoe.id}>
        <div className="shoe-card__head">
          <div className="shoe-card__name">
            <h2 className="card__title card__title--small">{shoe.name}</h2>
            {shoe.isDefault && !isRetired && <span className="shoe-card__default">Default for new runs</span>}
            {isRetired && <span className="card__eyebrow">Retired {new Date(`${shoe.retiredOn}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>}
          </div>
          <span className="shoe-card__mileage">{formatDistance(mileage, unit)}</span>
        </div>
        <p className="muted shoe-card__facts">{runs} {runs === 1 ? 'run' : 'runs'} assigned · {shoe.startingMeters ? 'includes starting mileage' : 'tracked in Askesis'}</p>
        {progress !== undefined && (
          <div className="shoe-card__target">
            <div className="shoe-card__track" role="progressbar" aria-label={`Mileage reminder for ${shoe.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="shoe-card__reminder">
              {remaining === 0
                ? `Your ${formatDistance(shoe.targetMeters!, unit)} reminder has been reached.`
                : `${formatDistance(remaining!, unit)} until your ${formatDistance(shoe.targetMeters!, unit)} reminder.`}
            </p>
            <p className="hint">A personal reminder, not a shoe-wear assessment.</p>
          </div>
        )}
        <div className="button-row shoe-card__actions">
          <button type="button" className="text-link" onClick={() => openEdit(shoe)}>Edit</button>
          {!isRetired ? (
            <>
              {!shoe.isDefault && <button type="button" className="text-link" onClick={() => chooseDefault(shoe.id)}>Use for new runs</button>}
              <button type="button" className="text-link" onClick={() => retire(shoe)}>Retire</button>
            </>
          ) : (
            <button type="button" className="text-link" onClick={() => restoreShoe(shoe)}>Restore</button>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="page shoes-page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Running shoes</h1>
      <p className="lead">Keep an eye on the distance each pair has covered. A shoe only accumulates runs you assign to it.</p>

      {active.length > 0 ? (
        <div className="shoe-list">{active.map((shoe) => shoeCard(shoe))}</div>
      ) : (
        <section className="card shoe-empty">
          <span className="card__eyebrow">Your rotation</span>
          <h2 className="card__title card__title--small">No shoes tracked yet</h2>
          <p className="muted">Add the pair you run in. You can include mileage from before you started tracking.</p>
        </section>
      )}

      {!formOpen && <button type="button" className="button-main" onClick={openNew}>Add a pair</button>}

      {formOpen && (
        <section className="card shoe-form">
          <div className="shoe-form__head">
            <h2 className="card__title card__title--small">{editingId ? 'Edit pair' : 'Add a pair'}</h2>
            <button type="button" className="text-link" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
          <label className="field">
            <span className="label">Name</span>
            <input className="input" autoFocus value={name} maxLength={60} placeholder="e.g. Pegasus 41" onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span className="label">Mileage already on these shoes ({unit})</span>
            <input className="input" inputMode="decimal" value={starting} onChange={(event) => setStarting(event.target.value)} placeholder="0" />
          </label>
          <label className="field">
            <span className="label">Remind me at ({unit}) · optional</span>
            <input className="input" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Set your own reminder" />
          </label>
          {problem && <p className="form-error" role="alert">{problem}</p>}
          <button type="button" className="button-main" onClick={save}>Save pair</button>
        </section>
      )}

      {retired.length > 0 && (
        <details className="more-about shoe-retired">
          <summary>Retired pairs · {retired.length}</summary>
          <div className="shoe-list">{retired.map((shoe) => shoeCard(shoe, true))}</div>
        </details>
      )}
    </div>
  );
}
