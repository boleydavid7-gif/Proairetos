import { useState } from 'react';
import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon } from '../../app/family/icons';
import SwipeItem from '../../app/family/SwipeItem';
import { Sym } from '../../lamplight/icons';
import type { SharedTodo } from '../../core/together/sharedTodos';
import { choreAssignee, dayText, markDone, nextDay, repeatText, shownDay, type Chore, type ChorePerson, type DaysOff } from '../core/chores';
import { addPerson, myName, putChore } from './state';

export function done(chore: Chore, today: string): void {
  tap();
  putChore(markDone(chore, today, myName() || chore.who));
  offerUndo(`${chore.name} done`, () => putChore(chore));
}

export function HouseholdWhoChips({ people, value, onChange, meId, label = 'Who' }: { people: readonly ChorePerson[]; value: string; onChange: (id: string) => void; meId?: string; label?: string }) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      <button type="button" className="chip" aria-pressed={!value} onClick={() => onChange('')}>Anyone</button>
      {people.map((person) => (
        <button key={person.id} type="button" className="chip" aria-pressed={value === person.id} onClick={() => onChange(person.id)}>
          {person.name}{person.id === meId ? ' (you)' : ''}
        </button>
      ))}
    </div>
  );
}

export function ChoreRow({ chore, today, onOpen, room = true, daysOff, people = [] }: { chore: Chore; today: string; onOpen: () => void; room?: boolean; daysOff?: DaysOff; people?: readonly ChorePerson[] }) {
  const day = nextDay(chore, daysOff);
  return (
    <SwipeItem className="chore" label="Done" onSwipe={() => done(chore, today)}>
      <button type="button" className="tick" aria-label={`${chore.name}: done`} onClick={() => done(chore, today)}>
        <CheckIcon size={20} />
      </button>
      <button type="button" className="chore__open" onClick={onOpen}>
        <span>
          {chore.name}
          {choreAssignee(chore, people) && <span className="who-chip">{choreAssignee(chore, people)}</span>}
        </span>
        <small>{[room ? chore.room : undefined, repeatText(chore.repeat)].filter(Boolean).join(' · ')}</small>
      </button>
      <span className="chore__when">{day ? dayText(shownDay(chore, day, today), today) : ''}</span>
    </SwipeItem>
  );
}

export function ChoreList({ chores, today, onOpen, room = true, daysOff, people = [] }: { chores: readonly Chore[]; today: string; onOpen: (chore: Chore) => void; room?: boolean; daysOff?: DaysOff; people?: readonly ChorePerson[] }) {
  return (
    <ul className="chore-list">
      {chores.map((chore) => <ChoreRow key={chore.id} chore={chore} today={today} onOpen={() => onOpen(chore)} room={room} daysOff={daysOff} people={people} />)}
    </ul>
  );
}

export function TodoRow({ todo, onToggle, onRemove }: { todo: SharedTodo; onToggle: () => void; onRemove: () => void }) {
  const done = Boolean(todo.doneAt);
  const who = done ? todo.doneBy : todo.by;
  return (
    <li className={`chore todo${done ? ' todo--done' : ''}`}>
      <button type="button" role="checkbox" aria-checked={done} aria-pressed={done} className="tick" aria-label={`${todo.title}: ${done ? 'not done' : 'done'}`} onClick={onToggle}>
        {done && <CheckIcon size={20} />}
      </button>
      <span className="chore__open todo__open">
        <span>{todo.title}</span>
        {who && <small>{done ? `Done by ${who}` : `Added by ${who}`}</small>}
      </span>
      <button type="button" className="todo__remove" aria-label={`Remove ${todo.title}`} onClick={onRemove}><Sym name="close" /></button>
    </li>
  );
}

export function TodoList({ todos, onToggle, onRemove }: { todos: readonly SharedTodo[]; onToggle: (todo: SharedTodo) => void; onRemove: (todo: SharedTodo) => void }) {
  return (
    <ul className="chore-list">
      {todos.map((todo) => <TodoRow key={todo.id} todo={todo} onToggle={() => onToggle(todo)} onRemove={() => onRemove(todo)} />)}
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
