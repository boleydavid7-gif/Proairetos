import { useState } from 'react';
import { Brand, offerUndo } from '../../app/family/shell';
import { AppMark, PlusIcon } from '../../app/family/icons';
import { Segmented } from '../../askesis/app/ui';
import { toLocalDate } from '../../core/scheduling/dates';
import photo from '../../assets/images/scenes/forest.webp';
import photoWide from '../../assets/images/scenes/forest-wide.webp';
import type { ErgonNav } from '../app/App';
import { newId, putChore, removeChore, settings, useChores, useHome } from '../app/state';
import { ChoreList } from '../app/ui';
import { IDEAS, grouped, type Chore } from '../core/chores';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

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
  const mineOnly = whose === 'mine' && current.me;
  const shown = mineOnly ? all.filter((chore) => !chore.who || chore.who === current.me) : all;
  const groups = grouped(shown, today);
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
            <p className="home__greeting">{greeting()}</p>
            <h1 className="home__title">{groups.now.length === 0 ? 'Nothing today' : groups.now.length === 1 ? groups.now[0].name : `${groups.now.length} today`}</h1>
            <p className="home__sub">{home ? home.name : 'Chores'}</p>
          </div>
        </div>
      </div>

      <div className="page page--under-hero">
        {current.me && home && (
          <Segmented label="Whose" value={whose} options={[{ id: 'all', label: 'Everyone' }, { id: 'mine', label: current.me }]} onChange={setWhose} small />
        )}

        {all.length === 0 ? (
          <section className="card">
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
            {groups.now.length ? <ChoreList chores={groups.now} today={today} onOpen={open} /> : <p className="muted">Nothing today.</p>}
            {groups.week.length > 0 && (
              <>
                <div className="section-head"><h2>This week</h2></div>
                <ChoreList chores={groups.week} today={today} onOpen={open} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
