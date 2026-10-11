import { useState } from 'react';
import { ChevronIcon, PlusIcon } from '../../app/family/icons';
import type { PhiliaNav } from '../app/App';
import { people } from '../app/state';
import { Initials } from '../app/ui';
import { dateText, matches } from '../core/people';

export default function PeoplePage({ nav }: { nav: PhiliaNav }) {
  const all = people.use();
  const [query, setQuery] = useState('');
  const shown = [...all].filter((person) => !query.trim() || matches(person, query)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page philia-page">
      <div className="page-top section-head">
        <h1 className="title">People</h1>
        <button type="button" className="button-main philia-add" onClick={() => nav.go({ name: 'edit' })}><PlusIcon size={18} />Add</button>
      </div>
      {all.length > 6 && <input className="input" type="search" placeholder="Search" aria-label="Search people" value={query} onChange={(event) => setQuery(event.target.value)} />}
      {all.length === 0 ? (
        <p className="muted">No one here yet.</p>
      ) : shown.length === 0 ? (
        <p className="muted">No one matches.</p>
      ) : (
        <ul className="rows">
          {shown.map((person) => (
            <li key={person.id}>
              <button type="button" className="row person-row" onClick={() => nav.go({ name: 'person', id: person.id })}>
                <Initials name={person.name} />
                <span className="row__text">
                  <span>{person.name}</span>
                  <span className="row__detail">{[person.relation, person.birthday && `Birthday ${dateText(person.birthday.slice(-5))}`].filter(Boolean).join(' · ')}</span>
                </span>
                <ChevronIcon size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
