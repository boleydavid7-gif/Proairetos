import { Sym } from '../../lamplight/icons';
import { useState } from 'react';
import { tap } from '../../app/feel';
import { DailyLine } from '../../app/family/DailyLine';
import { useHousehold } from '../../app/household/household';
import { Brand, offerUndo } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import { displayName } from '../../data/storage/preferences';
import { togetherLists, useTogether } from '../../app/together/together';
import { arrange, type SharedTodo } from '../../core/together/sharedTodos';
import { toLocalDate } from '../../core/scheduling/dates';
import photoWide from '../../assets/images/scenes/ergon-stoic-wide.webp';
import type { ErgonNav } from '../app/App';
import { newId, putChore, removeChore, settings, useChores, useHome, myName, peopleFor } from '../app/state';
import { ChoreList, TodoList } from '../app/ui';
import { useDaysOff } from '../app/daysOff';
import { IDEAS, grouped, markDone, roomsOf, type Chore, type ChorePerson } from '../core/chores';

export function Ideas({ chores }: { chores: readonly Chore[] }) {
  const today = toLocalDate(new Date());
  const left = IDEAS.filter((idea) => !chores.some((chore) => chore.name.toLowerCase() === idea.name.toLowerCase()));
  if (left.length === 0) return null;
  return (
    <div className="chip-row" aria-label="Ideas">
      {left.map((idea) => (
        <button
          key={idea.name}
          type="button"
          className="chip"
          onClick={() => {
            const chore: Chore = { id: newId(), name: idea.name, room: idea.room, repeat: idea.repeat, start: today, history: [], createdAt: new Date().toISOString() };
            putChore(chore);
            offerUndo(`${idea.name} added`, () => removeChore(chore.id));
          }}
        >
          <Sym name="plus" size={16} /> {idea.name}
        </button>
      ))}
    </div>
  );
}

export default function TodayPage({ nav }: { nav: ErgonNav }) {
  const all = useChores();
  const daysOff = useDaysOff();
  const current = settings.use();
  const home = useHome();
  const family = useHousehold();
  const { list: todoList, todos } = useTogether();
  const familyMode = family.parts.some((part) => part.app === 'ergon');
  const familyPeople: ChorePerson[] = familyMode
    ? family.members.map((member) => ({ id: member.id.slice('member:'.length), name: member.name }))
    : [];
  const today = toLocalDate(new Date());
  // Today starts on this person's assignments. An empty value is the explicit Everyone choice.
  const [whose, setWhose] = useState<string | null>(null);
  const people = familyMode ? familyPeople.map((person) => person.name) : peopleFor(all, current);
  const defaultWhose = familyMode ? family.currentUserId ?? '' : myName(current);
  const forWhom = whose === '' ? '' : whose ?? defaultWhose;
  const selectedPerson = familyPeople.find((person) => person.id === forWhom);
  const [room, setRoom] = useState('');
  const whoseShown = forWhom
    ? all.filter((chore) => familyMode
      ? (!chore.whoId && !chore.who) || chore.whoId === forWhom || (!chore.whoId && chore.who === selectedPerson?.name)
      : !chore.who || chore.who === forWhom)
    : all;
  const groups = grouped(whoseShown, today, daysOff);
  const rooms = roomsOf(groups.now);
  const inRoom = room && rooms.includes(room) ? room : '';
  const choresToday = inRoom ? groups.now.filter((chore) => chore.room === inRoom) : groups.now;
  const activeTodos = todoList ? arrange(todos, new Date()).open : [];
  const totalToday = choresToday.length + activeTodos.length;

  const allDone = () => {
    for (const chore of choresToday) putChore(markDone(chore, today, myName() || chore.who));
    offerUndo(inRoom ? `${inRoom} done` : 'Chores done', () => choresToday.forEach((chore) => putChore(chore)));
  };

  const toggleTodo = (todo: SharedTodo) => {
    if (!todoList) return;
    const me = displayName().trim() || undefined;
    const next = todo.doneAt ? { ...todo, doneAt: undefined, doneBy: undefined } : { ...todo, doneAt: new Date().toISOString(), doneBy: me };
    if (!todo.doneAt) tap();
    togetherLists.changeItem(todoList, todo.id, next);
    if (!todo.doneAt) offerUndo(`“${todo.title}” done`, async () => togetherLists.changeItem(todoList, todo.id, todo));
  };

  const removeTodo = (todo: SharedTodo) => {
    if (!todoList) return;
    togetherLists.changeItem(todoList, todo.id, null);
    offerUndo(`“${todo.title}” removed`, async () => togetherLists.changeItem(todoList, todo.id, todo));
  };

  return (
    <div className="home ergon-home">
      <div className="hero hero--tall hero-shade-soft">
        <picture>
          <img className="hero__image" src={photoWide} alt="" fetchPriority="high" decoding="async" />
        </picture>
        <div className="hero__shade" />
        <div className="hero__content">
          <Brand name="Ergon" mark={<AppMark app="ergon" size={30} light />} light />
          <div className="home__words">
            <h1 className="home__title">{totalToday > 0 ? `${totalToday} today` : 'Today'}</h1>
            <p className="home__sub">{home ? home.name : 'Chores and to-dos'}</p>
          </div>
        </div>
      </div>

      <div className="page page--under-hero">
        {totalToday > 0 ? (
          <>
            {choresToday.length > 0 && people.length > 1 && (familyMode || all.some((chore) => chore.who || chore.whoId)) && (
              <div className="chip-row" role="group" aria-label="Whose">
                <button type="button" className="chip" aria-pressed={!forWhom} onClick={() => setWhose('')}>Everyone</button>
                {familyMode
                  ? familyPeople.map((person) => <button key={person.id} type="button" className="chip" aria-pressed={forWhom === person.id} onClick={() => setWhose(person.id)}>{person.name}{person.id === family.currentUserId ? ' (you)' : ''}</button>)
                  : people.map((each) => <button key={each} type="button" className="chip" aria-pressed={forWhom === each} onClick={() => setWhose(each)}>{each}</button>)}
              </div>
            )}

            {choresToday.length > 0 && (
              <section className="chore-group">
                <div className="section-head"><h2>Chores</h2><button type="button" className="text-link" onClick={() => nav.swap({ name: 'chores' })}>All</button></div>
                {rooms.length > 1 && (
                  <div className="chip-row" role="group" aria-label="Room">
                    <button type="button" className="chip" aria-pressed={!inRoom} onClick={() => setRoom('')}>All rooms</button>
                    {rooms.map((each) => <button key={each} type="button" className="chip" aria-pressed={inRoom === each} onClick={() => setRoom(each)}>{each}</button>)}
                  </div>
                )}
                {inRoom && choresToday.length > 1 && <button type="button" className="text-link" onClick={allDone}>Mark all of these done</button>}
                <div className="ll-lit-wrap" data-ll-lit><ChoreList chores={choresToday} today={today} daysOff={daysOff} onOpen={(chore) => nav.go({ name: 'chore', id: chore.id })} people={familyPeople} /></div>
              </section>
            )}

            {activeTodos.length > 0 && (
              <section className="chore-group">
                <div className="section-head"><h2>To-dos</h2><button type="button" className="text-link" onClick={() => nav.swap({ name: 'todos' })}>All</button></div>
                <TodoList todos={activeTodos} onToggle={toggleTodo} onRemove={removeTodo} />
              </section>
            )}

            <DailyLine app="ergon" />
          </>
        ) : null}
      </div>
    </div>
  );
}
