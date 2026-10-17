import { useState } from 'react';
import { DailyLine } from '../../app/family/DailyLine';
import { Brand, offerUndo } from '../../app/family/shell';
import { AppMark, PlusIcon } from '../../app/family/icons';
import { Segmented } from '../../askesis/app/ui';
import { toLocalDate } from '../../core/scheduling/dates';
import photo from '../../assets/images/scenes/ergon.webp';
import photoWide from '../../assets/images/scenes/ergon-wide.webp';
import type { ErgonNav } from '../app/App';
import { newId, putChore, removeChore, settings, useChores, useHome, myName } from '../app/state';
import { ChoreList } from '../app/ui';
import { IDEAS, grouped, markDone, roomsOf, type Chore } from '../core/chores';


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
          + {idea.name}
        </button>
      ))}
    </div>
  );
}

export default function TodayPage({ nav }: { nav: ErgonNav }) {
  const all = useChores();
  const current = settings.use();
  const home = useHome();
  const today = toLocalDate(new Date());
  const [whose, setWhose] = useState<'mine' | 'all'>('all');
  const me = myName(current);
  const mineOnly = whose === 'mine' && me;
  const [room, setRoom] = useState('');
  const whoseShown = mineOnly ? all.filter((chore) => !chore.who || chore.who === me) : all;
  const rooms = roomsOf(grouped(whoseShown, today).now.concat(grouped(whoseShown, today).week));
  const inRoom = room && rooms.includes(room) ? room : '';
  const shown = inRoom ? whoseShown.filter((chore) => chore.room === inRoom) : whoseShown;
  const groups = grouped(shown, today);
  const allDone = () => {
    const before = groups.now;
    const by = myName() || undefined;
    for (const chore of before) putChore(markDone(chore, today, by ?? chore.who));
    offerUndo(`${inRoom} done`, () => before.forEach((chore) => putChore(chore)));
  };
  const open = (chore: Chore) => nav.go({ name: 'chore', id: chore.id });

  return (
    <div className="home ergon-home">
      <div className="hero hero--tall hero-shade-soft">
        <picture>
          <source media="(min-width: 62rem)" srcSet={photoWide} />
          <img className="hero__image" src={photo} alt="" />
        </picture>
        <div className="hero__shade" />
        <div className="hero__content">
          <Brand name="Ergon" mark={<AppMark app="ergon" size={30} light />} light />
          <div className="home__words">
            <h1 className="home__title">{groups.now.length === 0 ? 'Nothing today' : groups.now.length === 1 ? groups.now[0].name : `${groups.now.length} today`}</h1>
            <p className="home__sub">{home ? home.name : 'Chores'}</p>
          </div>
        </div>
      </div>

      <div className="page page--under-hero">
        {me && home && (
          <Segmented label="Whose" value={whose} options={[{ id: 'all', label: 'Everyone' }, { id: 'mine', label: me }]} onChange={setWhose} small />
        )}

        {all.length === 0 ? (
          <section className="card first-run">
            <h2 className="card__title">No chores yet</h2>
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'chore' })}><PlusIcon size={18} />Add a chore</button>
            <p className="label">Or start with</p>
            <Ideas chores={all} />
          </section>
        ) : (
          <>
            <div className="section-head">
              <h2>Today</h2>
              <button type="button" className="text-link" onClick={() => nav.go({ name: 'chore' })}>Add</button>
            </div>
            {rooms.length > 1 && (
              <div className="chip-row" role="group" aria-label="Room">
                <button type="button" className="chip" aria-pressed={!inRoom} onClick={() => setRoom('')}>All rooms</button>
                {rooms.map((each) => <button key={each} type="button" className="chip" aria-pressed={inRoom === each} onClick={() => setRoom(each)}>{each}</button>)}
              </div>
            )}
            {inRoom && groups.now.length > 1 && <button type="button" className="text-link" onClick={allDone}>Mark all of these done</button>}
            {groups.now.length ? <ChoreList chores={groups.now} today={today} onOpen={open} /> : <p className="muted">Nothing today.</p>}
            {groups.week.length > 0 && (
              <>
                <div className="section-head"><h2>This week</h2></div>
                <ChoreList chores={groups.week} today={today} onOpen={open} />
              </>
            )}
          </>
        )}
        {all.length > 0 && <DailyLine app="ergon" />}
      </div>
    </div>
  );
}
