import { useEffect, useRef, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { Segmented } from '../../askesis/app/ui';
import { toLocalDate } from '../../core/scheduling/dates';
import type { ErgonNav } from '../app/App';
import { findChore, newId, putChore, removeChore, settings, useChores } from '../app/state';
import { done } from '../app/ui';
import { ROOMS, dayText, namesIn, nextDay, skip, weekdayName, type Chore, type Repeat } from '../core/chores';

type Kind = Repeat['kind'];
const KINDS: { id: Kind; label: string }[] = [
  { id: 'days', label: 'Days' },
  { id: 'weeks', label: 'Weeks' },
  { id: 'weekdays', label: 'Days of the week' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'once', label: 'Once' },
];
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export default function ChorePage({ nav, id }: { nav: ErgonNav; id?: string }) {
  const all = useChores();
  const existing = id ? all.find((chore) => chore.id === id) ?? findChore(id) : undefined;
  const today = toLocalDate(new Date());
  const me = settings.use().me;
  const [name, setName] = useState(existing?.name ?? '');
  const [room, setRoom] = useState(existing?.room ?? '');
  const [kind, setKind] = useState<Kind>(existing?.repeat.kind ?? 'weeks');
  const [every, setEvery] = useState(existing && 'every' in existing.repeat ? existing.repeat.every : 1);
  const [days, setDays] = useState<number[]>(existing?.repeat.kind === 'weekdays' ? existing.repeat.days : [new Date().getDay()]);
  const [monthDay, setMonthDay] = useState(existing?.repeat.kind === 'monthly' ? existing.repeat.day : new Date().getDate());
  const [start, setStart] = useState(existing?.start ?? today);
  const [who, setWho] = useState(existing?.who ?? '');
  const [turns, setTurns] = useState(Boolean(existing?.rota?.length));
  const [rota, setRota] = useState<string[]>(existing?.rota ?? []);
  const [newName, setNewName] = useState('');
  const [note, setNote] = useState(existing?.note ?? '');
  const [remindAt, setRemindAt] = useState(existing?.remindAt ?? '');
  const nameField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!id) nameField.current?.focus();
  }, []);

  if (id && !existing) {
    return (
      <div className="page ergon-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Not found on this phone.</p>
      </div>
    );
  }

  const names = namesIn(all, [me, ...rota]);
  const repeat = (): Repeat => {
    switch (kind) {
      case 'days':
        return { kind, every: Math.max(1, every) };
      case 'weeks':
        return { kind, every: Math.max(1, every) };
      case 'weekdays':
        return { kind, days: days.length ? days : [new Date().getDay()] };
      case 'monthly':
        return { kind, day: monthDay };
      case 'once':
        return { kind };
    }
  };

  const save = () => {
    const rotaNames = turns ? rota.filter(Boolean) : undefined;
    const next: Chore = {
      ...(existing ?? { id: newId(), history: [], createdAt: new Date().toISOString() }),
      name: name.trim(),
      room: room.trim() || undefined,
      repeat: repeat(),
      start: existing?.history.length ? existing.start : start,
      who: turns ? (rotaNames?.includes(who) ? who : rotaNames?.[0]) : who.trim() || undefined,
      rota: rotaNames && rotaNames.length > 1 ? rotaNames : undefined,
      note: note.trim() || undefined,
      remindAt: remindAt || undefined,
    };
    putChore(next);
    if (existing) offerUndo('Saved', () => putChore(existing));
    nav.back();
  };

  const day = existing ? nextDay(existing) : undefined;

  return (
    <div className="page ergon-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Cancel</button>
        <p className="label">{existing ? 'Chore' : 'Add a chore'}</p>
        <button type="button" className="text-link" disabled={!name.trim()} onClick={save}>Save</button>
      </div>

      {existing && day && (
        <section className="card">
          <span className="card__eyebrow">{dayText(day, today)}</span>
          <div className="button-row">
            <button type="button" className="button-main" onClick={() => { done(existing, today); nav.back(); }}>Done</button>
            {day <= today && existing.repeat.kind !== 'once' && (
              <button
                type="button"
                className="button-quiet"
                onClick={() => {
                  putChore(skip(existing, today));
                  offerUndo(`${existing.name} skipped`, () => putChore(existing));
                  nav.back();
                }}
              >
                Skip this time
              </button>
            )}
          </div>
        </section>
      )}

      <label className="field">
        <span className="field__label">Chore</span>
        <input ref={nameField} className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Bins out" />
      </label>
      <label className="field">
        <span className="field__label">Room (optional)</span>
        <input className="input" list="ergon-rooms" value={room} onChange={(event) => setRoom(event.target.value)} />
        <datalist id="ergon-rooms">{ROOMS.map((each) => <option key={each} value={each} />)}</datalist>
      </label>

      <fieldset className="field">
        <legend className="field__label">Repeats</legend>
        <div className="chip-row" role="group" aria-label="Repeats">
          {KINDS.map((option) => (
            <button key={option.id} type="button" className="chip" aria-pressed={kind === option.id} onClick={() => setKind(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
        {(kind === 'days' || kind === 'weeks') && (
          <div className="stepper">
            <button type="button" className="stepper__button" aria-label="Fewer" onClick={() => setEvery(Math.max(1, every - 1))}>−</button>
            <span className="stepper__value">Every {every === 1 ? (kind === 'days' ? 'day' : 'week') : `${every} ${kind}`}</span>
            <button type="button" className="stepper__button" aria-label="More" onClick={() => setEvery(Math.min(kind === 'days' ? 60 : 52, every + 1))}>+</button>
          </div>
        )}
        {kind === 'weekdays' && (
          <div className="weekday-row" role="group" aria-label="Days">
            {WEEK.map((each) => (
              <button key={each} type="button" className="weekday" aria-pressed={days.includes(each)} onClick={() => setDays(days.includes(each) ? days.filter((d) => d !== each) : [...days, each])}>
                {weekdayName(each)}
              </button>
            ))}
          </div>
        )}
        {kind === 'monthly' && (
          <select className="input" aria-label="Day of the month" value={monthDay} onChange={(event) => setMonthDay(Number(event.target.value))}>
            {Array.from({ length: 30 }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
            <option value={31}>Last day</option>
          </select>
        )}
      </fieldset>

      {!existing?.history.length && (
        <label className="field">
          <span className="field__label">{kind === 'once' ? 'On' : 'From'}</span>
          <input className="input" type="date" value={start} onChange={(event) => setStart(event.target.value || today)} />
        </label>
      )}

      <fieldset className="field">
        <legend className="field__label">Who (optional)</legend>
        <Segmented label="Who" value={turns ? 'turns' : 'one'} options={[{ id: 'one', label: 'One person' }, { id: 'turns', label: 'Take turns' }]} onChange={(value) => setTurns(value === 'turns')} small />
        {!turns ? (
          <>
            <input className="input" list="ergon-names" value={who} onChange={(event) => setWho(event.target.value)} placeholder="Anyone" />
            <datalist id="ergon-names">{names.map((each) => <option key={each} value={each} />)}</datalist>
          </>
        ) : (
          <>
            <div className="chip-row">
              {names.map((each) => (
                <button key={each} type="button" className="chip" aria-pressed={rota.includes(each)} onClick={() => setRota(rota.includes(each) ? rota.filter((n) => n !== each) : [...rota, each])}>
                  {rota.includes(each) ? `${rota.indexOf(each) + 1}. ` : ''}{each}
                </button>
              ))}
            </div>
            <form
              className="add-line"
              onSubmit={(event) => {
                event.preventDefault();
                const clean = newName.trim();
                if (clean && !rota.includes(clean)) setRota([...rota, clean]);
                setNewName('');
              }}
            >
              <input className="input" placeholder="A name" aria-label="A name" value={newName} onChange={(event) => setNewName(event.target.value)} />
              <button type="submit" className="button-quiet" disabled={!newName.trim()}>Add</button>
            </form>
          </>
        )}
      </fieldset>

      <label className="field">
        <span className="field__label">Reminder time (optional)</span>
        <input className="input" type="time" value={remindAt} onChange={(event) => setRemindAt(event.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Note (optional)</span>
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>

      <button type="button" className="button-main" disabled={!name.trim()} onClick={save}>Save</button>

      {existing && existing.history.length > 0 && (
        <section className="card">
          <h2 className="card__title card__title--small">Done</h2>
          <ul className="notes-list">
            {[...existing.history].reverse().slice(0, 8).map((each, index) => (
              <li key={`${each.date}-${index}`} className="note-line">
                <span>{new Date(`${each.date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="muted">{each.by ?? ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {existing && (
        <button
          type="button"
          className="text-link remove-link"
          onClick={() => {
            removeChore(existing.id);
            offerUndo(`${existing.name} removed`, () => putChore(existing));
            nav.back();
          }}
        >
          Remove
        </button>
      )}
    </div>
  );
}
