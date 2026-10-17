import { Brand, offerUndo } from '../../app/family/shell';
import { DailyLine } from '../../app/family/DailyLine';
import { AppMark, ChevronIcon, PlusIcon } from '../../app/family/icons';
import { toLocalDate } from '../../core/scheduling/dates';
import photo from '../../assets/images/scenes/philia.webp';
import photoWide from '../../assets/images/scenes/philia-wide.webp';
import type { PhiliaNav } from '../app/App';
import { newId, people } from '../app/state';
import { Initials } from '../app/ui';
import SwipeItem from '../../app/family/SwipeItem';
import { comingUp, inTouchNow, logContact, shortDate, sinceText, turningText, whenText, type Person } from '../core/people';


export function markInTouch(person: Person, today: string) {
  const before = person;
  people.put(logContact(person, 'touch', today, newId()));
  offerUndo(`In touch with ${person.name}`, () => people.put(before));
}

export default function HomePage({ nav }: { nav: PhiliaNav }) {
  const all = people.use();
  const today = toLocalDate(new Date());
  const soon = comingUp(all, today, 30);
  const touch = inTouchNow(all, today);
  const times = all
    // Times together on Home; a plain call or message stays on the person's own page.
    .flatMap((person) => person.times.filter((time) => !time.how || time.how === 'visit' || time.text).map((time) => ({ person, time })))
    .sort((a, b) => b.time.date.localeCompare(a.time.date))
    .slice(0, 4);
  const first = soon[0];

  return (
    <div className="home philia-home">
      <div className="hero hero--tall hero-shade-soft">
        <picture>
          <source media="(min-width: 62rem)" srcSet={photoWide} />
          <img className="hero__image" src={photo} alt="" />
        </picture>
        <div className="hero__shade" />
        <div className="hero__content">
          <Brand name="Philia" mark={<AppMark app="philia" size={30} light />} light />
          <div className="home__words">
            <h1 className="home__title">{first ? (first.label === 'Birthday' ? `${first.person.name}’s birthday` : `${first.person.name}: ${first.label}`) : 'People'}</h1>
            {first && <p className="home__sub">{whenText(first.date, today)}</p>}
          </div>
        </div>
      </div>

      <div className="page page--under-hero">
        {all.length === 0 ? (
          <section className="card first-run">
            <h2 className="card__title">No one here yet</h2>
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'edit' })}><PlusIcon size={18} />Add someone</button>
            <button type="button" className="text-link" onClick={() => nav.swap({ name: 'more' })}>Bring in from Compass</button>
          </section>
        ) : (
          <>
            <div className="section-head"><h2>Coming up</h2></div>
            {soon.length === 0 ? (
              <p className="muted">Nothing in the next 30 days.</p>
            ) : (
              <div className="coming-up">
                {soon.slice(0, 8).map((entry) => (
                  <button key={entry.key} type="button" className="card card--link coming-up__card" onClick={() => nav.go({ name: 'person', id: entry.person.id })}>
                    <Initials name={entry.person.name} id={entry.person.id} />
                    <span className="list-row__text">
                      <strong>{entry.person.name}</strong>
                      <small>{[entry.label, turningText(entry)].filter(Boolean).join(' · ')}</small>
                      <span className="coming-up__when">{whenText(entry.date, today)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {touch.length > 0 && (
              <>
                <div className="section-head"><h2>Keep in touch</h2></div>
                <ul className="rows">
                  {touch.map((person) => (
                    <SwipeItem key={person.id} className="person-touch" label="In touch" onSwipe={() => markInTouch(person, today)}>
                      <button type="button" className="row person-row" onClick={() => nav.go({ name: 'person', id: person.id })}>
                        <Initials name={person.name} id={person.id} />
                        <span className="row__text"><span>{person.name}</span><span className="row__detail">{sinceText(person.lastInTouch, today)}</span></span>
                        <ChevronIcon size={18} />
                      </button>
                      <button type="button" className="button-quiet person-touch__mark" onClick={() => markInTouch(person, today)}>In touch today</button>
                    </SwipeItem>
                  ))}
                </ul>
              </>
            )}

            {times.length > 0 && (
              <>
                <div className="section-head"><h2>Times together</h2></div>
                <ul className="rows">
                  {times.map(({ person, time }) => (
                    <li key={time.id}>
                      <button type="button" className="row person-row" onClick={() => nav.go({ name: 'person', id: person.id })}>
                        <Initials name={person.name} id={person.id} />
                        <span className="row__text"><span>{time.text || (time.how === 'visit' ? 'Saw them' : 'In touch')}</span><span className="row__detail">{person.name} · {shortDate(time.date)}</span></span>
                        <ChevronIcon size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        {all.length > 0 && <DailyLine app="philia" />}
      </div>
    </div>
  );
}
