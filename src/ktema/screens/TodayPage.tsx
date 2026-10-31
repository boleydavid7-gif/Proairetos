import { Sym } from '../../lamplight/icons';
import { useState } from 'react';
import { Brand, offerUndo } from '../../app/family/shell';
import { DailyLine } from '../../app/family/DailyLine';
import { AppMark, PlusIcon } from '../../app/family/icons';
import photoWide from '../../assets/images/scenes/ktema-stoic-wide.webp';
import { toLocalDate } from '../../core/scheduling/dates';
import type { KtemaNav } from '../app/App';
import { newId, putUpkeep, settings, things, upkeeps } from '../app/state';
import { UpkeepRow } from '../app/ui';
import { IDEAS, IDEAS_NOTE, grouped, warrantiesEnding, warrantyText, type Upkeep } from '../core/things';


export function Ideas({ list, few = false }: { list: readonly Upkeep[]; few?: boolean }) {
  const unit = settings.use().distance;
  const today = toLocalDate(new Date());
  const [all, setAll] = useState(false);
  const every = IDEAS.filter((idea) => !list.some((each) => each.name.toLowerCase() === idea.name.toLowerCase()));
  const left = every.slice(0, few || !all ? 4 : undefined);
  if (!left.length) return null;
  return (
    <>
      <div className="chip-row" aria-label="Ideas">
        {left.map((idea) => (
          <button key={idea.name} type="button" className="chip" onClick={() => {
            const upkeep: Upkeep = { id: newId(), name: idea.name, every: idea.every, distance: idea.distance?.[unit], start: today, history: [], createdAt: new Date().toISOString() };
            putUpkeep(upkeep);
            offerUndo(`${idea.name} added`, () => upkeeps.remove(upkeep.id));
          }}><Sym name="plus" size={16} /> {idea.name}</button>
        ))}
        {!few && !all && every.length > left.length && (
          <button type="button" className="text-link" onClick={() => setAll(true)}>More ideas</button>
        )}
      </div>
      <p className="fine">{IDEAS_NOTE}</p>
    </>
  );
}

export default function TodayPage({ nav }: { nav: KtemaNav }) {
  const list = upkeeps.use();
  const owned = things.use();
  const today = toLocalDate(new Date());
  const groups = grouped(list, owned, today);
  const ending = warrantiesEnding(owned, today);
  const open = (upkeep: Upkeep) => nav.go({ name: 'upkeep', id: upkeep.id });
  const row = ({ upkeep, due }: (typeof groups.now)[number]) => (
    <UpkeepRow key={upkeep.id} upkeep={upkeep} due={due} thing={owned.find((thing) => thing.id === upkeep.thingId)} today={today} onOpen={() => open(upkeep)} />
  );

  return (
    <div className="home ktema-home">
      <div className="hero hero--tall hero-shade-soft">
        <picture>
          <img className="hero__image" src={photoWide} alt="" fetchPriority="high" decoding="async" />
        </picture>
        <div className="hero__shade" />
        <div className="hero__content">
          <Brand name="Ktema" mark={<AppMark app="ktema" size={30} light />} light />
          <div className="home__words">
            <h1 className="home__title">{list.length === 0 && owned.length === 0 ? 'Things' : groups.now.length === 0 ? 'Nothing today' : groups.now.length === 1 ? groups.now[0].upkeep.name : `${groups.now.length} to look after`}</h1>
          </div>
        </div>
      </div>

      <div className="page page--under-hero">
        {list.length === 0 && owned.length === 0 ? (
          <section className="card">
            <h2 className="card__title">Nothing kept yet</h2>
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'thing' })}><PlusIcon size={18} />Add a thing</button>
            <p className="label">Or start with upkeep</p>
            <Ideas list={list} />
          </section>
        ) : (
          <>
            <div className="section-head">
              <h2>Now</h2>
              <button type="button" className="text-link" onClick={() => nav.go({ name: 'upkeep' })}>Add upkeep</button>
            </div>
            {groups.now.length ? <ul className="chore-list" data-ll-lit>{groups.now.map(row)}</ul> : <p className="muted">Nothing today.</p>}
            {groups.soon.length > 0 && (
              <>
                <div className="section-head"><h2>Next 30 days</h2></div>
                <ul className="chore-list">{groups.soon.map(row)}</ul>
              </>
            )}
            {ending.length > 0 && (
              <>
                <div className="section-head"><h2>Ending soon</h2></div>
                <ul className="chore-list">
                  {ending.map((thing) => (
                    <li key={thing.id} className="chore">
                      <button type="button" className="chore__open" onClick={() => nav.go({ name: 'thing', id: thing.id })}>
                        <span>{thing.name}</span>
                        <small>{warrantyText(thing, today)}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {groups.later.length > 0 && (
              <>
                <div className="section-head"><h2>Later</h2></div>
                <ul className="chore-list">{groups.later.map(row)}</ul>
              </>
            )}
            {list.length < 4 && (
              <>
                <p className="label">Ideas</p>
                <Ideas list={list} few />
              </>
            )}
          </>
        )}
        <DailyLine app="ktema" />
      </div>
    </div>
  );
}
