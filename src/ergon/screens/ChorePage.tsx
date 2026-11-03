import MoreDetails from '../../app/family/MoreDetails';
import { WriteTag } from '../../app/family/DeviceExtras';
import { useEffect, useRef, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { useHousehold } from '../../app/household/household';
import { Segmented } from '../../askesis/app/ui';
import { parseLocalDate, toLocalDate } from '../../core/scheduling/dates';
import type { ErgonNav } from '../app/App';
import { addPerson, findChore, newId, peopleFor, putChore, removeChore, settings, useChores } from '../app/state';
import { HouseholdWhoChips, WhoChips, done } from '../app/ui';
import { BroomIcon } from '../../app/family/icons';
import { useDaysOff } from '../app/daysOff';
import { ROOMS, choreAssignee, choreRotaNames, dayText, memberIdForName, nextDay, repeatText, skip, stepsFromText, toggleStep, weekdayName, type Chore, type ChorePerson, type Repeat } from '../core/chores';
import { CheckIcon } from '../../app/family/icons';
import { Sym } from '../../lamplight/icons';

type Kind = Repeat['kind'];
const KINDS: { id: Kind; label: string }[] = [
  { id: 'days', label: 'Days' },
  { id: 'weeks', label: 'Weeks' },
  { id: 'weekdays', label: 'Days of the week' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'once', label: 'Once' },
];
const WEEK = [1, 2, 3, 4, 5, 6, 0];

function ChoreForm({ existing, onDone }: { existing?: Chore; onDone: () => void }) {
  const all = useChores();
  const family = useHousehold();
  const today = toLocalDate(new Date());
  settings.use();
  const familyMode = family.parts.some((part) => part.app === 'ergon');
  const familyPeople: ChorePerson[] = familyMode
    ? family.members.map((member) => ({ id: member.id.slice('member:'.length), name: member.name }))
    : [];
  const [name, setName] = useState(existing?.name ?? '');
  const [room, setRoom] = useState(existing?.room ?? '');
  const [kind, setKind] = useState<Kind>(existing?.repeat.kind ?? 'weeks');
  const [every, setEvery] = useState(existing && 'every' in existing.repeat ? existing.repeat.every : 1);
  const [days, setDays] = useState<number[]>(existing?.repeat.kind === 'weekdays' ? existing.repeat.days : [new Date().getDay()]);
  const [monthDay, setMonthDay] = useState(existing?.repeat.kind === 'monthly' ? existing.repeat.day : new Date().getDate());
  const [start, setStart] = useState(existing?.start ?? today);
  const [who, setWho] = useState(existing?.who ?? '');
  const [whoId, setWhoId] = useState(existing?.whoId ?? '');
  const [turns, setTurns] = useState(Boolean(existing?.rota?.length || existing?.rotaIds?.length));
  const [rota, setRota] = useState<string[]>(existing?.rota ?? []);
  const [rotaIds, setRotaIds] = useState<string[] | undefined>(existing?.rotaIds);
  const [newName, setNewName] = useState('');
  const [note, setNote] = useState(existing?.note ?? '');
  const [remindAt, setRemindAt] = useState(existing?.remindAt ?? '');
  const [stepLines, setStepLines] = useState(existing?.steps?.map((step) => step.text).join('\n') ?? '');
  const nameField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!existing) nameField.current?.focus();
  }, []);

  const names = [...new Set([...peopleFor(all), ...rota])];
  const selectedWhoId = whoId || memberIdForName(who, familyPeople) || '';
  const selectedWhoIsCurrent = familyPeople.some((person) => person.id === selectedWhoId);
  const selectedRotaIds = (rotaIds ?? rota.map((person) => memberIdForName(person, familyPeople)).filter((id): id is string => Boolean(id)))
    .filter((id) => familyPeople.some((person) => person.id === id));
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
    let nextWho = turns ? (rota.includes(who) ? who : rota[0]) : who.trim() || undefined;
    let nextWhoId: string | undefined = existing?.whoId;
    let nextRota = turns ? rota.filter(Boolean) : undefined;
    let nextRotaIds: string[] | undefined = existing?.rotaIds;

    if (familyMode) {
      if (turns && selectedRotaIds.length) {
        nextRotaIds = selectedRotaIds.length > 1 ? selectedRotaIds : undefined;
        nextRota = selectedRotaIds.map((id) => familyPeople.find((person) => person.id === id)?.name).filter((value): value is string => Boolean(value));
        const currentId = selectedWhoId && selectedRotaIds.includes(selectedWhoId) ? selectedWhoId : selectedRotaIds[0];
        nextWhoId = currentId;
        nextWho = familyPeople.find((person) => person.id === currentId)?.name ?? nextRota[0];
      } else if (turns) {
        nextRota = existing?.rota ?? (rota.length ? rota : undefined);
        nextRotaIds = familyPeople.length === 0 && rotaIds === undefined && rota.join('|') === (existing?.rota ?? []).join('|')
          ? existing?.rotaIds
          : undefined;
        nextWho = who.trim() || nextRota?.[0];
        nextWhoId = familyPeople.length === 0 ? existing?.whoId : undefined;
      } else {
        nextWhoId = selectedWhoIsCurrent
          ? selectedWhoId
          : familyPeople.length === 0 && who === existing?.who && whoId === (existing?.whoId ?? '') ? existing?.whoId : undefined;
        nextWho = familyPeople.find((person) => person.id === selectedWhoId)?.name ?? (who.trim() || undefined);
        nextRota = undefined;
        nextRotaIds = undefined;
      }
    } else {
      if (!turns) {
        nextWhoId = who === existing?.who ? existing?.whoId : undefined;
        nextRotaIds = undefined;
      } else {
        nextWhoId = who === existing?.who ? existing?.whoId : undefined;
        nextRotaIds = rota.join('|') === (existing?.rota ?? []).join('|') ? existing?.rotaIds : undefined;
      }
    }

    const next: Chore = {
      ...(existing ?? { id: newId(), history: [], createdAt: new Date().toISOString() }),
      name: name.trim(),
      room: room.trim() || undefined,
      repeat: repeat(),
      start: existing?.history.length ? existing.start : start,
      who: nextWho || undefined,
      whoId: nextWhoId,
      rota: nextRota && nextRota.length > 1 ? nextRota : undefined,
      rotaIds: nextRotaIds,
      note: note.trim() || undefined,
      steps: stepsFromText(stepLines, existing?.steps),
      remindAt: remindAt || undefined,
    };
    putChore(next);
    if (existing) offerUndo('Saved', () => putChore(existing));
    onDone();
  };

  return (
    <div className="page ergon-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={onDone}>Cancel</button>
        <p className="label">{existing ? 'Edit' : 'Add a chore'}</p>
        <button type="button" className="text-link" disabled={!name.trim()} onClick={save}>Save</button>
      </div>

      <label className="field">
        <span className="field__label">Chore</span>
        <input ref={nameField} className="input" value={name} onChange={(event) => setName(event.target.value)} />
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
            <button type="button" className="stepper__button" aria-label="Fewer" onClick={() => setEvery(Math.max(1, every - 1))}><Sym name="minus" /></button>
            <span className="stepper__value">Every {every === 1 ? (kind === 'days' ? 'day' : 'week') : `${every} ${kind}`}</span>
            <button type="button" className="stepper__button" aria-label="More" onClick={() => setEvery(Math.min(kind === 'days' ? 60 : 52, every + 1))}><Sym name="plus" /></button>
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
        <legend className="field__label">Who</legend>
        <Segmented label="Who" value={turns ? 'turns' : 'one'} options={[{ id: 'one', label: 'One person' }, { id: 'turns', label: 'Take turns' }]} onChange={(value) => setTurns(value === 'turns')} small />
        {!turns ? (
          familyMode ? (
            <>
              {who && !selectedWhoIsCurrent && <p className="hint">This chore was previously assigned to {who}. Choose a current family member to update the assignment.</p>}
              <HouseholdWhoChips
                people={familyPeople}
                value={selectedWhoId}
                meId={family.currentUserId}
                onChange={(id) => {
                  setWhoId(id);
                  setWho(familyPeople.find((person) => person.id === id)?.name ?? '');
                }}
              />
            </>
          ) : (
            <WhoChips people={names} value={who} onChange={setWho} />
          )
        ) : familyMode ? (
          <>
            <div className="chip-row" role="group" aria-label="Turn order">
              {familyPeople.map((person) => {
                const at = selectedRotaIds.indexOf(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    className="chip"
                    aria-pressed={at >= 0}
                    onClick={() => setRotaIds(at >= 0 ? selectedRotaIds.filter((id) => id !== person.id) : [...selectedRotaIds, person.id])}
                  >
                    {at >= 0 ? `${at + 1}. ` : ''}{person.name}{person.id === family.currentUserId ? ' (you)' : ''}
                  </button>
                );
              })}
            </div>
            {familyPeople.length === 0 && <p className="hint">Family members will appear here once the household list has synced.</p>}
            {rota.length > 0 && selectedRotaIds.length === 0 && <p className="hint">This rotation uses saved names. Select household members to link the turns to your family.</p>}
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
                if (clean && !rota.includes(clean)) {
                  addPerson(clean);
                  setRota([...rota, clean]);
                }
                setNewName('');
              }}
            >
              <input className="input" aria-label="A name" value={newName} onChange={(event) => setNewName(event.target.value)} />
              <button type="submit" className="button-quiet" disabled={!newName.trim()}>Add</button>
            </form>
          </>
        )}
      </fieldset>

      <MoreDetails open={Boolean(existing && (existing.room || existing.remindAt || existing.steps?.length || existing.note))}>
      <label className="field">
        <span className="field__label">Room (optional)</span>
        <input className="input" list="ergon-rooms" value={room} onChange={(event) => setRoom(event.target.value)} />
        <datalist id="ergon-rooms">{ROOMS.map((each) => <option key={each} value={each} />)}</datalist>
      </label>

      <label className="field">
        <span className="field__label">Reminder time (optional)</span>
        <input className="input" type="time" value={remindAt} onChange={(event) => setRemindAt(event.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Steps (optional)</span>
        <textarea className="input" rows={3} value={stepLines} onChange={(event) => setStepLines(event.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Note (optional)</span>
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      </MoreDetails>

      <button type="button" className="button-main" disabled={!name.trim()} onClick={save}>Save</button>

    </div>
  );
}

function ChoreView({ nav, chore: existing, onEdit }: { nav: ErgonNav; chore: Chore; onEdit: () => void }) {
  const today = toLocalDate(new Date());
  const daysOff = useDaysOff();
  const family = useHousehold();
  const familyMode = family.parts.some((part) => part.app === 'ergon');
  const familyPeople: ChorePerson[] = familyMode
    ? family.members.map((member) => ({ id: member.id.slice('member:'.length), name: member.name }))
    : [];
  const plain = nextDay(existing);
  const day = nextDay(existing, daysOff);
  const people = peopleFor(useChores(), settings.use());
  const assignedId = existing.whoId ?? memberIdForName(existing.who, familyPeople);
  const assignedName = choreAssignee(existing, familyPeople);
  const rotationNames = choreRotaNames(existing, familyPeople);
  const who = (existing.rotaIds?.length || existing.rota?.length)
    ? `Taking turns: ${rotationNames.join(', ')}${assignedName ? ` (next ${assignedName})` : ''}`
    : assignedName;

  return (
    <div className="page ergon-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">Chore</p>
        <button type="button" className="text-link" onClick={onEdit}>Edit</button>
      </div>

      <div className="detail-head">
        <span className="detail-head__mark"><BroomIcon size={32} /></span>
        <div>
          <h1 className="title">{existing.name}</h1>
          <p className="muted">{[existing.room, repeatText(existing.repeat)].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      {day && (
        <section className="card">
          <span className="card__eyebrow">{dayText(day, today)}</span>
          {plain && day !== plain && <p className="muted">Moved from {parseLocalDate(plain).toLocaleDateString(undefined, { weekday: 'short' })}, a work day.</p>}
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

      {existing.steps && existing.steps.length > 0 && (
        <section className="card">
          <h2 className="card__title card__title--small">Steps</h2>
          <ul className="ergon-steps">
            {existing.steps.map((step, index) => (
              <li key={`${index}-${step.text}`}>
                <button type="button" className={`ergon-step${step.done ? ' is-done' : ''}`} role="checkbox" aria-checked={Boolean(step.done)} onClick={() => putChore(toggleStep(existing, index))}>
                  <span className="ergon-step__box" aria-hidden="true">{step.done && <CheckIcon size={16} />}</span>
                  <span>{step.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(existing.rota?.length || existing.rotaIds?.length) ? null : (
        <section className="card">
          <h2 className="card__title card__title--small">Who</h2>
          {familyMode ? (
            <>
              {existing.who && (!assignedId || !familyPeople.some((person) => person.id === assignedId)) && <p className="hint">Previously assigned to {existing.who}. Choose a current household member to update it.</p>}
              <HouseholdWhoChips
                people={familyPeople}
                value={assignedId ?? ''}
                meId={family.currentUserId}
                onChange={(id) => {
                  const name = familyPeople.find((person) => person.id === id)?.name;
                  putChore({ ...existing, who: name, whoId: id || undefined });
                  offerUndo(name ? `“${existing.name}” given to ${name}` : `“${existing.name}” for anyone`, () => putChore(existing));
                }}
              />
            </>
          ) : (
            <WhoChips
              people={people}
              value={existing.who ?? ''}
              onChange={(name) => {
                putChore({ ...existing, who: name || undefined, whoId: undefined });
                offerUndo(name ? `“${existing.name}” given to ${name}` : `“${existing.name}” for anyone`, () => putChore(existing));
              }}
            />
          )}
        </section>
      )}

      {(((existing.rota?.length || existing.rotaIds?.length) && who) || existing.remindAt || existing.note) && (
        <dl className="detail-list">
          {existing.rota?.length && who ? <><dt>Who</dt><dd>{who}</dd></> : null}
          {existing.remindAt && <><dt>Reminder</dt><dd>{existing.remindAt}</dd></>}
          {existing.note && <><dt>Note</dt><dd>{existing.note}</dd></>}
        </dl>
      )}

      {existing.history.length > 0 && (
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

      <WriteTag path={`/ergon/?open=chore:${existing.id}`} />
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
    </div>
  );
}

export default function ChorePage({ nav, id }: { nav: ErgonNav; id?: string }) {
  const all = useChores();
  const existing = id ? all.find((chore) => chore.id === id) ?? findChore(id) : undefined;
  const [editing, setEditing] = useState(!id);
  if (id && !existing) {
    return (
      <div className="page ergon-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Not found on this device.</p>
      </div>
    );
  }
  if (existing && !editing) return <ChoreView nav={nav} chore={existing} onEdit={() => setEditing(true)} />;
  return <ChoreForm key={existing?.id ?? 'new'} existing={existing} onDone={() => (existing ? setEditing(false) : nav.back())} />;
}
