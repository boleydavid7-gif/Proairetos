import { Brand, offerUndo } from '../../app/family/shell';
import { DailyLine } from '../../app/family/DailyLine';
import { AppMark, CheckIcon } from '../../app/family/icons';
import photoWide from '../../assets/images/scenes/dynamis-stoic-wide.webp';
import { toLocalDate } from '../../core/scheduling/dates';
import type { DynamisNav } from '../app/App';
import ExerciseFigure from '../app/ExerciseFigure';
import { draft, isSetup, mobility, plan, savePlan, workouts } from '../app/state';
import { ROUTINES, routineMinutes, weekMobility } from '../core/mobility';
import { useStore } from '../../app/family/read';
import { useAddedApps } from '../../app/family/added';
import { useFittedWeek } from '../../app/family/trainingWeek';
import { fromRunDays, isTrainingDay, nextSession, sessionMinutes, setsOffer, targetsFor, weekDays } from '../core/plan';


export default function TodayPage({ nav }: { nav: DynamisNav }) {
  const current = plan.use();
  const done = workouts.use();
  const stretched = mobility.use();
  const live = draft.use().current;
  const runsOn = useStore<{ id: string; weekdays?: number[] }>('askesisPlans', useAddedApps().includes('askesis'));
  const today = toLocalDate(new Date());
  const fitted = useFittedWeek(today, [current, done.length]);

  if (!isSetup(current)) {
    return (
      <div className="home dynamis-home">
        <Hero title="Strength and mobility" sub="Dynamis" />
        <div className="page page--under-hero">
          <section className="card">
            <h2 className="card__title">Make your plan</h2>
            <p className="muted">Your aim, where you train and which days.</p>
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'plan' })}>Begin</button>
          </section>
        </div>
      </div>
    );
  }

  const session = nextSession(current, done);
  const targets = targetsFor(current, session, done);
  const placedLifts = fitted && Object.values(fitted.lifts);
  const placedRuns = fitted && Object.values(fitted.runs);
  const trainingToday = isTrainingDay(current, today, placedLifts);
  const doneToday = done.some((workout) => workout.date === today);
  const offer = setsOffer(current, done);
  const runDays = fromRunDays(runsOn.find((record) => record.id === 'current')?.weekdays ?? []);
  const runOn = (date: string) => (placedRuns?.length ? placedRuns.includes(date) : runDays.includes(new Date(`${date}T12:00`).getDay()));
  const week = weekAllDays(today).filter((date) => isTrainingDay(current, date, placedLifts) || runOn(date));
  const moved = weekMobility(stretched, weekAllDays(today));

  return (
    <div className="home dynamis-home">
      <Hero title={doneToday ? 'That’s the session' : trainingToday ? session.name : `Next: ${session.name}`} sub={doneToday ? 'Today' : `About ${sessionMinutes(targets)} min`} />
      <div className="page page--under-hero">
        <section className="card" data-ll-lit={!doneToday || undefined}>
          <span className="card__eyebrow">{live ? 'In progress' : doneToday ? 'Next time' : trainingToday ? 'Today' : 'Next'}</span>
          <h2 className="card__title">{session.name}</h2>
          <ul className="notes-list">
            {targets.map((target) => (
              <li key={target.exercise} className="note-line dynamis-line">
                <span className="dynamis-line__name"><ExerciseFigure id={target.exercise} step={target.step} size={40} still />{target.name}</span>
                <span className="muted">{target.sets} × {target.range[0]}–{target.range[1]}{target.measure === 'seconds' ? ' s' : ''}{target.ready ? ' · ready for more' : ''}</span>
              </li>
            ))}
          </ul>
          <button type="button" className={doneToday && !live ? 'button-quiet' : 'button-main'} onClick={() => nav.go({ name: 'session' })}>{live ? 'Carry on' : doneToday ? 'Start another' : 'Start'}</button>
        </section>

        {offer && (
          <section className="card">
            <span className="card__eyebrow">{`${offer} sets of each`}</span>
            <p>Six sessions at {current.sets} sets. Ready for {offer}?</p>
            <div className="button-row">
              <button type="button" className="button-quiet" onClick={() => {
                savePlan({ ...current, sets: offer, setsSince: today });
                offerUndo(`${offer} sets from now`, () => savePlan(current));
              }}>Yes</button>
              <button type="button" className="text-link" onClick={() => savePlan({ ...current, setsSince: today })}>Not now</button>
            </div>
          </section>
        )}

        <div className="section-head"><h2>This week</h2></div>
        <ul className="dynamis-week">
          {week.map((date) => {
            const trained = done.some((workout) => workout.date === date);
            return (
              <li key={date} className={'dynamis-week__day' + (date === today ? ' is-today' : '') + (trained ? ' is-done' : '')}>
                <span>{new Date(`${date}T12:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <small className="dynamis-week__what">{[isTrainingDay(current, date, placedLifts) ? 'Lift' : undefined, runOn(date) ? 'Run' : undefined].filter(Boolean).join(' · ')}</small>
                {trained ? <CheckIcon size={16} /> : <span className="dynamis-week__dot" />}
              </li>
            );
          })}
        </ul>
        {(runDays.length > 0 || Boolean(placedRuns?.length)) && <p className="fine">{current.fit ? 'Placed around your work and your runs from Askesis.' : 'Runs from Askesis are shown beside your lifting days.'}</p>}
        {done.filter((workout) => weekAllDays(today).includes(workout.date) && !week.includes(workout.date)).length > 0 && <p className="fine">Also trained on other days this week.</p>}

        <div className="section-head">
          <h2>Mobility</h2>
          <button type="button" className="text-link" onClick={() => nav.swap({ name: 'mobility' })}>All</button>
        </div>
        <div className="chip-row">
          {ROUTINES.slice(0, 3).map((routine) => (
            <button key={routine.id} type="button" className="chip" onClick={() => nav.go({ name: 'guide', routine: routine.id })}>{routine.name} · {routineMinutes(routine)} min</button>
          ))}
        </div>
        {moved.days > 0 && <p className="fine">This week: {moved.days === 1 ? 'one day' : `${moved.days} days`}, {moved.minutes} min.</p>}
        <DailyLine app="dynamis" />
      </div>
    </div>
  );
}

function weekAllDays(date: string): string[] {
  return weekDays({ days: [0, 1, 2, 3, 4, 5, 6] }, date);
}

function Hero({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="hero hero--tall hero-shade-soft">
      <picture>
        <img className="hero__image" src={photoWide} alt="" />
      </picture>
      <div className="hero__shade" />
      <div className="hero__content">
        <Brand name="Dynamis" mark={<AppMark app="dynamis" size={30} light />} light />
        <div className="home__words">
          <h1 className="home__title">{title}</h1>
          <p className="home__sub">{sub}</p>
        </div>
      </div>
    </div>
  );
}
