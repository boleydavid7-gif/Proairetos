import { useState } from 'react';
import { BoxIcon, PlusIcon, PrintIcon } from '../../app/family/icons';
import { Empty } from '../../app/family/shell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { KtemaNav } from '../app/App';
import { things } from '../app/state';
import { CATEGORIES, search, warrantyText } from '../core/things';

export default function ThingsPage({ nav }: { nav: KtemaNav }) {
  const all = things.use();
  const [text, setText] = useState('');
  const today = toLocalDate(new Date());
  const found = search(all, text).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="page ktema-page">
      <div className="page-top section-head">
        <h1 className="title">Things</h1>
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'thing' })}><PlusIcon size={18} />Add</button>
      </div>
      {all.length > 5 && <input className="input" type="search" aria-label="Find a thing" placeholder="Find a thing, a model, a serial" value={text} onChange={(event) => setText(event.target.value)} />}
      {all.length === 0 && <Empty icon={<BoxIcon size={26} />} title="No things yet" line="Appliances, the car, a laptop, documents: models, serials and warranties." />}
      {CATEGORIES.map((category) => {
        const inIt = found.filter((thing) => thing.category === category);
        if (!inIt.length) return null;
        return (
          <section key={category}>
            <div className="section-head"><h2>{category}</h2></div>
            <ul className="chore-list">
              {inIt.map((thing) => (
                <li key={thing.id} className="chore">
                  <button type="button" className="chore__open" onClick={() => nav.go({ name: 'thing', id: thing.id })}>
                    <span>{thing.name}</span>
                    <small>{[thing.place, [thing.make, thing.model].filter(Boolean).join(' '), warrantyText(thing, today)].filter(Boolean).join(' · ')}</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {text && !found.length && <p className="muted">Nothing matches.</p>}
      {all.length > 0 && (
        <div className="button-row">
          <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'print' })}><PrintIcon size={18} />Print the list</button>
        </div>
      )}
    </div>
  );
}
