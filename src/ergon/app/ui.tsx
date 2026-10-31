import { useState } from 'react';
import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon } from '../../app/family/icons';
import SwipeItem from '../../app/family/SwipeItem';
import { dayText, markDone, nextDay, repeatText, shownDay, type Chore, type DaysOff } from '../core/chores';
import { addPerson, myName, putChore } from './state';

export function done(chore: Chore, today: string): void {
  tap();
  putChore(markDone(chore, today, myName() || chore.who));
  offerUndo(`${chore.name} done`, () => putChore(chore));
}

export function ChoreRow({ chore, today, onOpen, room = true, daysOff }: { chore: Chore; today: string; onOpen: () => void; room?: boolean; daysOff?: DaysOff }) {
  const day = nextDay(chore, daysOff);
  return (
    <SwipeItem className="chore" label="Done" onSwipe={() => done(chore, today)}>
      <button type="button" className="tick" aria-label={`${chore.name}: done`} onClick={() => done(chore, today)}>
        <CheckIcon size={20} />
      </button>
      <button type="button" className="chore__open" onClick={onOpen}>
        <span>
          {chore.name}
          {chore.who && <span className="who-chip">{chore.who}</span>}
        </span>
        <small>{[room ? chore.room : undefined, repeatText(chore.repeat)].filter(Boolean).join(' · ')}</small>
      </button>
      <span className="chore__when">{day ? dayText(shownDay(chore, day, today), today) : ''}</span>
    </SwipeItem>
  );
}

export function ChoreList({ chores, today, onOpen, room = true, daysOff }: { chores: readonly Chore[]; today: string; onOpen: (chore: Chore) => void; room?: boolean; daysOff?: DaysOff }) {
  return (
    <ul className="chore-list">
      {chores.map((chore) => <ChoreRow key={chore.id} chore={chore} today={today} onOpen={() => onOpen(chore)} room={room} daysOff={daysOff} />)}
    </ul>
  );
}

/**
 * Who a chore is given to, as chips: Anyone, each name (this person first), and Someone else to add a name. The
 * names added are kept, so they are there for the next chore.
 */
export function WhoChips({ people, value, onChange, label = 'Who' }: { people: readonly string[]; value: string; onChange: (name: string) => void; label?: string }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const me = myName();
  const shown = value && !people.includes(value) ? [...people, value] : people;
  const add = () => {
    const clean = name.trim();
    if (!clean) return;
    addPerson(clean);
    onChange(clean);
    setName('');
    setAdding(false);
  };
  return (
    <>
      <div className="chip-row" role="group" aria-label={label}>
        <button type="button" className="chip" aria-pressed={!value} onClick={() => onChange('')}>Anyone</button>
        {shown.map((each) => (
          <button key={each} type="button" className="chip" aria-pressed={value === each} onClick={() => onChange(each)}>
            {each === me ? `${each} (me)` : each}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={adding} onClick={() => setAdding(!adding)}>Someone else</button>
      </div>
      {adding && (
        <form
          className="add-line"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <input className="input" aria-label="Name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          <button type="submit" className="button-quiet" disabled={!name.trim()}>Add</button>
        </form>
      )}
    </>
  );
}
