import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import type { PhiliaNav } from '../app/App';
import { newId, people } from '../app/state';
import { DateFields } from '../app/ui';
import { dateText, datePartsToText, newPerson, withDate } from '../core/people';

type Kind = 'birthday' | 'anniversary' | 'other';
type Parts = { month: number; day: number; year?: number };

const KINDS: { id: Kind; label: string }[] = [
  { id: 'birthday', label: 'Birthday' },
  { id: 'anniversary', label: 'Anniversary' },
  { id: 'other', label: 'Other' },
];

/** A birthday, anniversary or other date for someone: every year, or an event that happens once (with a time if it has one). */
export default function AddDatePage({ nav, personId }: { nav: PhiliaNav; personId?: string }) {
  const everyone = people.use().slice().sort((a, b) => a.name.localeCompare(b.name));
  const [who, setWho] = useState(personId ?? everyone[0]?.id ?? 'new');
  const [newName, setNewName] = useState('');
  const [kind, setKind] = useState<Kind>('birthday');
  const [label, setLabel] = useState('');
  const [once, setOnce] = useState(false);
  const [parts, setParts] = useState<Parts>({ month: 0, day: 0 });
  const [time, setTime] = useState('');

  const person = who === 'new' ? undefined : everyone.find((each) => each.id === who);
  const yearly = kind === 'birthday' || !once;
  const date = datePartsToText(parts);
  const ready = Boolean(date) && (yearly || Boolean(parts.year)) && (who !== 'new' || Boolean(newName.trim())) && (kind !== 'other' || Boolean(label.trim()));

  const pick = (next: Kind) => {
    setKind(next);
    setOnce(next === 'other');
  };

  const save = () => {
    if (!date) return;
    const before = person;
    const base = person ?? newPerson(newId(), newName, new Date());
    const next =
      kind === 'birthday'
        ? withDate(base, { birthday: date })
        : withDate(base, {
            date: {
              id: newId(),
              label: kind === 'anniversary' ? label.trim() || 'Anniversary' : label.trim(),
              date,
              ...(once ? { once: true, ...(time ? { time } : {}) } : {}),
            },
          });
    people.put(next);
    const what = kind === 'birthday' ? `${next.name}’s birthday` : `“${kind === 'anniversary' ? label.trim() || 'Anniversary' : label.trim()}”`;
    offerUndo(`${what} added`, () => (before ? people.put(before) : people.remove(next.id)));
    if (personId) nav.back();
    else nav.swap({ name: 'person', id: next.id });
  };

  return (
    <div className="page philia-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Cancel</button>
        <p className="label">Add a date</p>
        <button type="button" className="text-link" disabled={!ready} onClick={save}>Save</button>
      </div>

      {!personId && (
        <label className="field">
          <span className="field__label">Who</span>
          <select className="input" value={who} onChange={(event) => setWho(event.target.value)}>
            {everyone.map((each) => <option key={each.id} value={each.id}>{each.name}</option>)}
            <option value="new">Someone new</option>
          </select>
        </label>
      )}
      {who === 'new' && (
        <label className="field">
          <span className="field__label">Name</span>
          <input className="input" value={newName} onChange={(event) => setNewName(event.target.value)} autoComplete="off" />
        </label>
      )}

      <div className="chip-row" role="group" aria-label="What">
        {KINDS.map((each) => (
          <button key={each.id} type="button" className="chip" aria-pressed={kind === each.id} onClick={() => pick(each.id)}>
            {each.label}
          </button>
        ))}
      </div>
      {kind !== 'birthday' && (
        <label className="field">
          <span className="field__label">{kind === 'other' ? 'What' : 'Name (optional)'}</span>
          <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
      )}
      {kind !== 'birthday' && (
        <div className="chip-row" role="group" aria-label="How often">
          <button type="button" className="chip" aria-pressed={!once} onClick={() => setOnce(false)}>Every year</button>
          <button type="button" className="chip" aria-pressed={once} onClick={() => setOnce(true)}>Once</button>
        </div>
      )}

      <DateFields label={yearly ? 'Date' : 'Date (with the year)'} value={parts} onChange={setParts} />
      {!yearly && (
        <label className="field">
          <span className="field__label">Time (optional)</span>
          <input className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
      )}
      {kind === 'birthday' && person?.birthday && <p className="fine">Replaces {dateText(person.birthday)}.</p>}

      <button type="button" className="button-main" disabled={!ready} onClick={save}>Save</button>
    </div>
  );
}
