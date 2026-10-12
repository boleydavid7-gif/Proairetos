import { ReadFromPhoto } from '../../app/family/ReadFromPhoto';
import { medicineFromText } from '../../core/ocr/labels';
import { useEffect, useRef, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { Switch } from '../../askesis/app/ui';
import { toLocalDate } from '../../core/scheduling/dates';
import type { TherapeiaNav } from '../app/App';
import { medicines, newId, putMedicine, removeMedicine } from '../app/state';
import PillMark from '../app/PillMark';
import { PILL_COLORS, PILL_SHAPES, timeText, isCurrent, daysText, type PillLook, WEEKDAYS, daysLeft, durationText, record, refill, supplyLeft, type DoseDays, type DoseTime, type Medicine } from '../core/medicines';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const OFFSETS = [0, 15, 30, 60, 120];
type DaysKind = DoseDays['kind'];

function TimeEditor({ time, onChange, onRemove }: { time: DoseTime; onChange: (next: DoseTime) => void; onRemove: () => void }) {
  return (
    <div className="dose-time">
      <select className="input" aria-label="Kind of time" value={time.kind} onChange={(event) => {
        const kind = event.target.value as DoseTime['kind'];
        onChange(kind === 'clock' ? { kind, at: '08:00' } : kind === 'wake' ? { kind, after: 0 } : { kind, before: 0 });
      }}>
        <option value="clock">At a time</option>
        <option value="wake">After waking</option>
        <option value="sleep">Before sleep</option>
      </select>
      {time.kind === 'clock' ? (
        <input className="input" type="time" aria-label="Time" value={time.at} onChange={(event) => event.target.value && onChange({ kind: 'clock', at: event.target.value })} />
      ) : (
        <select className="input" aria-label="How long" value={time.kind === 'wake' ? time.after : time.before} onChange={(event) => {
          const minutes = Number(event.target.value);
          onChange(time.kind === 'wake' ? { kind: 'wake', after: minutes } : { kind: 'sleep', before: minutes });
        }}>
          {OFFSETS.map((minutes) => <option key={minutes} value={minutes}>{minutes === 0 ? (time.kind === 'wake' ? 'On waking' : 'At bedtime') : durationText(minutes)}</option>)}
        </select>
      )}
      <button type="button" className="text-link" aria-label="Remove this time" onClick={onRemove}>Remove</button>
    </div>
  );
}

function MedicineForm({ id, existing, onDone }: { id?: string; existing?: Medicine; onDone: () => void }) {
  const today = toLocalDate(new Date());
  const [name, setName] = useState(existing?.name ?? '');
  const [dose, setDose] = useState(existing?.dose ?? '');
  const [how, setHow] = useState(existing?.how ?? '');
  const [times, setTimes] = useState<DoseTime[]>(existing ? existing.times : [{ kind: 'clock', at: '08:00' }]);
  const [daysKind, setDaysKind] = useState<DaysKind>(existing?.days.kind ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(existing?.days.kind === 'weekdays' ? existing.days.days : [new Date().getDay()]);
  const [every, setEvery] = useState(existing?.days.kind === 'every' ? existing.days.every : 2);
  const [start, setStart] = useState(existing?.start ?? today);
  const [end, setEnd] = useState(existing?.end ?? '');
  const [asNeeded, setAsNeeded] = useState(existing?.asNeeded ?? false);
  const [gap, setGap] = useState(existing?.gapHours ? String(existing.gapHours) : '');
  const [counting, setCounting] = useState(Boolean(existing?.supply));
  const [count, setCount] = useState(existing?.supply ? String(supplyLeft(existing) ?? existing.supply.count) : '');
  const [perDose, setPerDose] = useState(existing?.supply ? String(existing.supply.perDose) : '1');
  const [lead, setLead] = useState(existing?.supply?.lead ?? 7);
  const [note, setNote] = useState(existing?.note ?? '');
  const [look, setLook] = useState<PillLook | undefined>(existing?.look);
  const nameField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!id) nameField.current?.focus();
  }, []);

  const days = (): DoseDays => (daysKind === 'weekdays' ? { kind: 'weekdays', days: weekdays.length ? weekdays : [new Date().getDay()] } : daysKind === 'every' ? { kind: 'every', every: Math.max(2, every) } : { kind: 'daily' });
  const valid = name.trim() && (times.length > 0 || asNeeded);

  const save = () => {
    const counted = Number(count);
    const perDoseNow = Math.max(0.25, Number(perDose) || 1);
    // A count left as it was keeps counting from before; a new count starts from now.
    const unchanged = existing?.supply && supplyLeft(existing) === counted;
    const supply = !counting || count === '' || !(counted >= 0)
      ? undefined
      : unchanged && existing?.supply
        ? { ...existing.supply, perDose: perDoseNow, lead }
        : { count: counted, countedAt: new Date().toISOString(), perDose: perDoseNow, lead };
    const next: Medicine = {
      ...(existing ?? { id: newId(), taken: [], createdAt: new Date().toISOString() }),
      name: name.trim(),
      dose: dose.trim() || undefined,
      how: how.trim() || undefined,
      times,
      days: days(),
      start,
      end: end || undefined,
      asNeeded: asNeeded || undefined,
      gapHours: asNeeded && Number(gap) > 0 ? Number(gap) : undefined,
      supply,
      note: note.trim() || undefined,
      look,
    };
    putMedicine(next);
    if (existing) offerUndo('Saved', () => putMedicine(existing));
    onDone();
  };


  return (
    <div className="page therapeia-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={onDone}>Cancel</button>
        <p className="label">{existing ? 'Edit' : 'Add a medicine'}</p>
        <button type="button" className="text-link" disabled={!valid} onClick={save}>Save</button>
      </div>

      {!existing && (
        <ReadFromPhoto
          label="Read the label"
          find={medicineFromText}
          onUse={(values) => {
            if (values.name) setName(values.name);
            if (values.dose) setDose(values.dose);
            if (values.how) setHow(values.how);
          }}
        />
      )}
      <label className="field">
        <span className="field__label">Name</span>
        <input ref={nameField} className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="As on the label" autoCapitalize="words" />
      </label>
      <div className="input-row">
        <label className="field">
          <span className="field__label">Dose (optional)</span>
          <input className="input" value={dose} onChange={(event) => setDose(event.target.value)} placeholder="1 tablet" />
        </label>
        <label className="field">
          <span className="field__label">How (optional)</span>
          <input className="input" value={how} onChange={(event) => setHow(event.target.value)} placeholder="With food" />
        </label>
      </div>

      <fieldset className="field">
        <legend className="field__label">Looks like (optional)</legend>
        <div className="pill-choices" role="group" aria-label="Shape">
          {PILL_SHAPES.map((shape) => (
            <button key={shape} type="button" className="pill-choice" aria-pressed={look?.shape === shape} aria-label={shape} onClick={() => setLook(look?.shape === shape ? undefined : { shape, color: look?.color ?? 'white', color2: look?.color2 })}>
              <PillMark look={{ shape, color: look?.color ?? 'white', color2: look?.color2 }} size={30} />
            </button>
          ))}
        </div>
        {look && (
          <div className="pill-colours" role="group" aria-label="Colour">
            {Object.entries(PILL_COLORS).map(([key, value]) => (
              <button key={key} type="button" className="pill-colour" style={{ background: value }} aria-label={key} aria-pressed={look.color === key} onClick={() => setLook({ ...look, color: key })} />
            ))}
          </div>
        )}
        {look && (look.shape === 'capsule' || look.shape === 'inhaler' || look.shape === 'patch' || look.shape === 'injection') && (
          <div className="pill-colours" role="group" aria-label="Second colour">
            {Object.entries(PILL_COLORS).map(([key, value]) => (
              <button key={key} type="button" className="pill-colour pill-colour--small" style={{ background: value }} aria-label={`${key}, second colour`} aria-pressed={(look.color2 ?? look.color) === key} onClick={() => setLook({ ...look, color2: key })} />
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Times</legend>
        {times.map((time, index) => (
          <TimeEditor
            key={index}
            time={time}
            onChange={(next) => setTimes(times.map((each, at) => (at === index ? next : each)))}
            onRemove={() => setTimes(times.filter((_, at) => at !== index))}
          />
        ))}
        <button type="button" className="button-quiet" onClick={() => setTimes([...times, { kind: 'clock', at: '20:00' }])}>Add a time</button>
      </fieldset>

      {times.length > 0 && (
        <fieldset className="field">
          <legend className="field__label">Days</legend>
          <div className="chip-row" role="group" aria-label="Days">
            {([['daily', 'Every day'], ['weekdays', 'Days of the week'], ['every', 'Every few days']] as const).map(([kind, label]) => (
              <button key={kind} type="button" className="chip" aria-pressed={daysKind === kind} onClick={() => setDaysKind(kind)}>{label}</button>
            ))}
          </div>
          {daysKind === 'weekdays' && (
            <div className="weekday-row" role="group" aria-label="Weekdays">
              {WEEK.map((day) => (
                <button key={day} type="button" className="weekday" aria-pressed={weekdays.includes(day)} onClick={() => setWeekdays(weekdays.includes(day) ? weekdays.filter((each) => each !== day) : [...weekdays, day])}>
                  {WEEKDAYS[day]}
                </button>
              ))}
            </div>
          )}
          {daysKind === 'every' && (
            <div className="stepper">
              <button type="button" className="stepper__button" aria-label="Fewer" onClick={() => setEvery(Math.max(2, every - 1))}>−</button>
              <span className="stepper__value">Every {every} days</span>
              <button type="button" className="stepper__button" aria-label="More" onClick={() => setEvery(Math.min(30, every + 1))}>+</button>
            </div>
          )}
        </fieldset>
      )}

      <div className="input-row">
        <label className="field">
          <span className="field__label">From</span>
          <input className="input" type="date" value={start} onChange={(event) => setStart(event.target.value || today)} />
        </label>
        <label className="field">
          <span className="field__label">Until (optional)</span>
          <input className="input" type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} />
        </label>
      </div>

      <section className="card switches">
        <Switch on={asNeeded} label="As needed" onToggle={() => setAsNeeded(!asNeeded)} />
        {asNeeded && (
          <label className="field">
            <span className="field__label">Hours apart (optional)</span>
            <input className="input" inputMode="decimal" value={gap} onChange={(event) => setGap(event.target.value.replace(/[^\d.]/g, ''))} placeholder="As directed" />
          </label>
        )}
        <Switch on={counting} label="Count what is left" onToggle={() => setCounting(!counting)} />
        {counting && (
          <>
            <div className="input-row">
              <label className="field">
                <span className="field__label">On hand</span>
                <input className="input" inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value.replace(/[^\d.]/g, ''))} placeholder="28" />
              </label>
              <label className="field">
                <span className="field__label">Each dose uses</span>
                <input className="input" inputMode="decimal" value={perDose} onChange={(event) => setPerDose(event.target.value.replace(/[^\d.]/g, ''))} />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Refill reminder</span>
              <select className="input" value={lead} onChange={(event) => setLead(Number(event.target.value))}>
                {[3, 5, 7, 10, 14].map((days) => <option key={days} value={days}>{days} days before running out</option>)}
              </select>
            </label>
          </>
        )}
      </section>

      <label className="field">
        <span className="field__label">Note (optional)</span>
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Prescribed by, what it is for" />
      </label>

      <button type="button" className="button-main" disabled={!valid} onClick={save}>Save</button>

    </div>
  );
}

function MedicineView({ nav, medicine: existing, onEdit }: { nav: TherapeiaNav; medicine: Medicine; onEdit: () => void }) {
  const today = toLocalDate(new Date());
  const [refillCount, setRefillCount] = useState('');
  const history = record(existing, today);
  const left = daysLeft(existing);
  const when = [existing.times.length ? existing.times.map(timeText).join(', ') : undefined, existing.asNeeded ? `As needed${existing.gapHours ? `, ${existing.gapHours} h apart` : ''}` : undefined].filter(Boolean);
  const dated = (date: string) => new Date(`${date}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="page therapeia-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">Medicine</p>
        <button type="button" className="text-link" onClick={onEdit}>Edit</button>
      </div>

      <div className="detail-head">
        <span className="detail-head__mark"><PillMark look={existing.look} size={56} /></span>
        <div>
          <h1 className="title">{existing.name}</h1>
          <p className="muted">{[existing.dose, existing.how].filter(Boolean).join(' · ') || (isCurrent(existing, today) ? 'Taking now' : 'Not taking now')}</p>
        </div>
      </div>

      <dl className="detail-list">
        {when.length > 0 && <><dt>When</dt><dd>{when.join(' · ')}</dd></>}
        {existing.times.length > 0 && <><dt>Days</dt><dd>{daysText(existing.days)}</dd></>}
        <dt>From</dt><dd>{dated(existing.start)}{existing.end ? ` until ${dated(existing.end)}` : ''}</dd>
        {existing.stopped && <><dt>Stopped</dt><dd>{dated(existing.stopped)}</dd></>}
        {existing.note && <><dt>Note</dt><dd>{existing.note}</dd></>}
      </dl>

      {existing?.supply && (
        <section className="card">
          <span className="card__eyebrow">{`${supplyLeft(existing)} left${left !== undefined && existing.times.length ? ` · about ${left} days` : ''}`}</span>
          <form
            className="add-line"
            onSubmit={(event) => {
              event.preventDefault();
              const added = Number(refillCount);
              if (!(added > 0)) return;
              putMedicine(refill(existing, added, new Date()));
              offerUndo(`${added} added`, () => putMedicine(existing));
              setRefillCount('');
            }}
          >
            <input className="input" inputMode="numeric" aria-label="How many came" placeholder="Refill: how many" value={refillCount} onChange={(event) => setRefillCount(event.target.value.replace(/\D/g, ''))} />
            <button type="submit" className="button-quiet" disabled={!(Number(refillCount) > 0)}>Add</button>
          </form>
        </section>
      )}

      {history.length > 0 && (
        <section className="card">
          <h2 className="card__title card__title--small">Marked</h2>
          <ul className="notes-list">
            {history.map((day) => (
              <li key={day.date} className="note-line">
                <span>{new Date(`${day.date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="muted">{[day.taken.join(', '), day.skipped ? (day.skipped === 1 ? 'skipped once' : `skipped ${day.skipped}`) : undefined].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {existing && (
        <div className="button-row">
          {existing.stopped && existing.stopped <= today ? (
            <button type="button" className="button-quiet" onClick={() => {
              putMedicine({ ...existing, stopped: undefined });
              offerUndo(`${existing.name} back on the list`, () => putMedicine(existing));
            }}>Taking it again</button>
          ) : (
            <button type="button" className="button-quiet" onClick={() => {
              putMedicine({ ...existing, stopped: today });
              offerUndo(`${existing.name} stopped`, () => putMedicine(existing));
              nav.back();
            }}>Stopped taking it</button>
          )}
          <button type="button" className="text-link remove-link" onClick={() => {
            removeMedicine(existing.id);
            offerUndo(`${existing.name} removed`, () => putMedicine(existing));
            nav.back();
          }}>Remove</button>
        </div>
      )}
    </div>
  );
}

export default function MedicinePage({ nav, id }: { nav: TherapeiaNav; id?: string }) {
  const existing = medicines.use().find((medicine) => medicine.id === id);
  const [editing, setEditing] = useState(!id);
  if (id && !existing) {
    return (
      <div className="page therapeia-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Not found on this phone.</p>
      </div>
    );
  }
  if (existing && !editing) return <MedicineView nav={nav} medicine={existing} onEdit={() => setEditing(true)} />;
  return <MedicineForm key={existing?.id ?? 'new'} id={id} existing={existing} onDone={() => (existing ? setEditing(false) : nav.back())} />;
}
