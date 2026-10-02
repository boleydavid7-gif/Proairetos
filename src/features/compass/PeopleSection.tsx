import { useState, type FormEvent } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService } from '../../app/services';
import { MAX_PEOPLE, type CompassStatement } from '../../core/compass/types';
import { dayLabel } from '../reflect/format';

/** "today", "yesterday", or a date. */
function touchLabel(iso: string): string {
  const label = dayLabel(iso);
  return label === 'Today' || label === 'Yesterday' ? label.toLowerCase() : label;
}

function Person({ person }: { person: CompassStatement }) {
  const { offerUndo } = useOverlays();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(person.note ?? '');

  return (
    <li className="person">
      <button type="button" className="person__main" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="person__name">{person.body}</span>
        {person.note && <span className="person__note">{person.note}</span>}
        {person.inTouchAt && <span className="person__touch">In touch {touchLabel(person.inTouchAt)}</span>}
      </button>
      {open && (
        <div className="person__more">
          <input
            className="field-input"
            aria-label={`A line about ${person.body}`}
            placeholder="A line, if you like: why they matter, what you share"
            value={note}
            maxLength={280}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => note !== (person.note ?? '') && compassService.updatePerson(person.id, { note })}
          />
          <div className="chip-row">
            <button
              type="button"
              className="chip chip--small"
              onClick={() => compassService.updatePerson(person.id, { inTouchAt: new Date().toISOString() })}
            >
              We were in touch today
            </button>
            <button
              type="button"
              className="button-quiet"
              onClick={async () => {
                const removal = await compassService.removeStatement(person.id);
                offerUndo(`Removed ${person.body}`, removal.undo);
              }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * People who matter, kept in view. Friendship sits near the centre of a good
 * life for Aristotle and Epicurus alike. The app never prompts contact or
 * measures it; "in touch" is only a note the person chooses to make.
 */
export default function PeopleSection({ people }: { people: CompassStatement[] }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await compassService.addPerson(name);
      setName('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add that.');
    }
  }

  return (
    <section className="stack-tight" aria-label="People who matter">
      <div>
        <h2 className="section-label">People who matter</h2>
        <p className="section-description">Kept here so they stay in view. Nothing is counted.</p>
      </div>
      {people.length > 0 && (
        <ul className="people">
          {people.map((person) => (
            <Person key={person.id} person={person} />
          ))}
        </ul>
      )}
      {people.length < MAX_PEOPLE && (
        <form className="inline-form" onSubmit={submit}>
          <input
            className="field-input"
            aria-label="A person’s name"
            placeholder="A name"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="button-accent" disabled={!name.trim()}>
            Add
          </button>
        </form>
      )}
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}
