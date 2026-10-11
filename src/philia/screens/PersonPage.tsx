import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { BackIcon, CheckIcon } from '../../app/family/icons';
import { toLocalDate } from '../../core/scheduling/dates';
import type { PhiliaNav } from '../app/App';
import { newId, people } from '../app/state';
import { AddLine, Initials } from '../app/ui';
import { RHYTHMS, dateText, nextOccurrence, shortDate, sinceText, turningText, whenText, yearOf, type Person } from '../core/people';
import { markInTouch } from './HomePage';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="card__title card__title--small">{title}</h2>
      {children}
    </section>
  );
}

export default function PersonPage({ nav, id }: { nav: PhiliaNav; id: string }) {
  const person = people.use().find((each) => each.id === id);
  const today = toLocalDate(new Date());
  const [timeDate, setTimeDate] = useState(today);

  if (!person) {
    return (
      <div className="page philia-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Back</button></div>
        <p className="muted">Not found on this phone.</p>
      </div>
    );
  }

  const change = (patch: Partial<Person>, message?: string) => {
    const before = person;
    people.put({ ...person, ...patch });
    if (message) offerUndo(message, () => people.put(before));
  };
  const at = () => new Date().toISOString();

  const birthdayNext = person.birthday ? nextOccurrence(person.birthday, today) : undefined;

  return (
    <div className="page philia-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Back</button>
        <button type="button" className="text-link" onClick={() => nav.go({ name: 'edit', id: person.id })}>Edit</button>
      </div>

      <div className="person-head">
        <Initials name={person.name} large />
        <div>
          <h1 className="title">{person.name}</h1>
          {person.relation && <p className="muted">{person.relation}</p>}
        </div>
      </div>

      {(person.birthday || (person.dates ?? []).length > 0) && (
        <section className="card">
          {person.birthday && birthdayNext && (
            <div className="list-row philia-date">
              <span className="list-row__text"><span>Birthday</span><small>{dateText(person.birthday)}{yearOf(person.birthday) ? ` · ${turningText({ label: 'Birthday', turning: Number(birthdayNext.slice(0, 4)) - yearOf(person.birthday)! })}` : ''}</small></span>
              <span className="list-row__aside">{whenText(birthdayNext, today)}</span>
            </div>
          )}
          {(person.dates ?? []).map((each) => {
            const next = nextOccurrence(each.date, today);
            return (
              <div key={each.id} className="list-row philia-date">
                <span className="list-row__text"><span>{each.label}</span><small>{dateText(each.date)}</small></span>
                <span className="list-row__aside">{whenText(next, today)}</span>
              </div>
            );
          })}
        </section>
      )}

      <Section title="Keep in touch">
        <select className="input" aria-label="Keep in touch" value={person.keepInTouch ?? ''} onChange={(event) => change({ keepInTouch: event.target.value ? Number(event.target.value) : undefined })}>
          <option value="">No reminder</option>
          {RHYTHMS.map((rhythm) => <option key={rhythm.days} value={rhythm.days}>{rhythm.label}</option>)}
        </select>
        <div className="section-head">
          <span className="muted">{sinceText(person.lastInTouch, today)}</span>
          {person.lastInTouch?.slice(0, 10) !== today && <button type="button" className="button-quiet" onClick={() => markInTouch(person, today)}>In touch today</button>}
        </div>
      </Section>

      <Section title="Remember">
        {person.notes.length > 0 && (
          <ul className="notes-list">
            {person.notes.map((note) => (
              <li key={note.id} className="note-line">
                <span>{note.text}</span>
                <button type="button" aria-label={`Remove ${note.text}`} onClick={() => change({ notes: person.notes.filter((each) => each.id !== note.id) }, 'Removed')}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <AddLine label="Something to remember" onAdd={(text) => change({ notes: [...person.notes, { id: newId(), text, at: at() }] })} />
      </Section>

      <Section title="Gift ideas">
        {person.gifts.length > 0 && (
          <ul className="notes-list">
            {person.gifts.map((gift) => (
              <li key={gift.id} className="note-line philia-gift">
                <span>
                  {gift.text}
                  {gift.given && <small>Given {shortDate(gift.given)}</small>}
                </span>
                <span>
                  <button
                    type="button"
                    className="tick philia-gift__tick"
                    aria-pressed={Boolean(gift.given)}
                    aria-label={gift.given ? `${gift.text}: given` : `Mark ${gift.text} given`}
                    onClick={() => change({ gifts: person.gifts.map((each) => (each.id === gift.id ? { ...each, given: each.given ? undefined : today } : each)) })}
                  >
                    <CheckIcon size={18} />
                  </button>
                  <button type="button" aria-label={`Remove ${gift.text}`} onClick={() => change({ gifts: person.gifts.filter((each) => each.id !== gift.id) }, 'Removed')}>✕</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <AddLine label="A gift idea" onAdd={(text) => change({ gifts: [...person.gifts, { id: newId(), text, at: at() }] })} />
      </Section>

      <Section title="Times together">
        {person.times.length > 0 && (
          <ul className="notes-list">
            {[...person.times].sort((a, b) => b.date.localeCompare(a.date)).map((time) => (
              <li key={time.id} className="note-line">
                <span>
                  {time.text}
                  <small>{shortDate(time.date)}</small>
                </span>
                <button type="button" aria-label={`Remove ${time.text}`} onClick={() => change({ times: person.times.filter((each) => each.id !== time.id) }, 'Removed')}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <input className="input" type="date" aria-label="Day" value={timeDate} max={today} onChange={(event) => setTimeDate(event.target.value || today)} />
        <AddLine
          label="What you did"
          onAdd={(text) => {
            const latest = [person.lastInTouch?.slice(0, 10), timeDate].filter(Boolean).sort().pop();
            change({ times: [...person.times, { id: newId(), date: timeDate, text }], lastInTouch: latest });
          }}
        />
      </Section>

      <button
        type="button"
        className="text-link remove-link"
        onClick={() => {
          people.remove(person.id);
          offerUndo(`${person.name} removed`, () => people.put(person));
          nav.back();
        }}
      >
        Remove {person.name}
      </button>
    </div>
  );
}
