import { useState } from 'react';
import { BoxIcon, PlusIcon, PrintIcon } from '../../app/family/icons';
import { Empty } from '../../app/family/shell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { KtemaNav } from '../app/App';
import { things } from '../app/state';
import { CATEGORIES, search, warrantyText } from '../core/things';
import { byRoom } from '../core/insurance';
import { Segmented } from '../../askesis/app/ui';

export default function ThingsPage({ nav }: { nav: KtemaNav }) {
  const all = things.use();
  const [text, setText] = useState('');
  const today = toLocalDate(new Date());
  const [by, setBy] = useState<'kind' | 'room'>('kind');
  const found = search(all, text).sort((a, b) => a.name.localeCompare(b.name));
  const groups: [string, typeof found][] = by === 'room' ? byRoom(found) : CATEGORIES.map((category): [string, typeof found] => [category, found.filter((thing) => thing.category === category)]);
  return (
    <div className="page ktema-page">
      <div className="page-top section-head">
        <h1 className="title">Things</h1>
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'thing' })}><PlusIcon size={18} />Add</button>
      </div>
      {all.length > 5 && <input className="input" type="search" aria-label="Find a thing" placeholder="Find a thing, a model, a serial" value={text} onChange={(event) => setText(event.target.value)} />}
      {all.length === 0 && <Empty icon={<BoxIcon size={28} />} title="No things yet" line="Appliances, the car, a laptop, documents: models, serials and warranties." />}
      {all.length > 1 && <Segmented label="Group by" value={by} options={[{ id: 'kind', label: 'Kind' }, { id: 'room', label: 'Room' }]} onChange={setBy} small />}
      {groups.map(([group, inIt]) => {
        if (!inIt.length) return null;
        return (
          <section key={group}>
            <div className="section-head"><h2>{group}</h2></div>
            <ul className="chore-list">
              {inIt.map((thing) => (
                <li key={thing.id} className="chore">
                  <button type="button" className="chore__open" onClick={() => nav.go({ name: 'thing', id: thing.id })}>
                    <span>{thing.name}</span>
                    <small>{[by === 'room' ? thing.category : thing.place, [thing.make, thing.model].filter(Boolean).join(' '), warrantyText(thing, today)].filter(Boolean).join(' · ')}</small>
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
          <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'print', insurance: true })}>Insurance list</button>
        </div>
      )}
    </div>
  );
}
