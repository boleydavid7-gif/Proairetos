import { useMemo, useState } from 'react';
import { addDays, mondayOnOrBefore } from '../../core/scheduling/dates';
import type { Nav } from '../app/App';
import { ChevronIcon, ClockIcon, PulseIcon } from '../app/icons';
import { kindScene, scene } from '../app/scenes';
import { updatePlan, useEntries, useSettings, useToday, useWeekSchedule } from '../app/state';
import { Brand, dayLabel, greeting, Hero } from '../app/ui';
import { efforts } from '../core/effort';
import { feelings } from '../core/log';
import { aimWords, isLastWeek, weekAt, type Plan } from '../core/plans';
import LookBack from './LookBack';
import { lineFor } from '../core/stoic';
import { asToday, comeBackOffer, gapWords } from '../core/gentler';
import { freeDaysThisWeek, layOut, weekDates, type DayPlan } from '../core/week';
import { lengthLabel, mainEffort, totalMinutes } from '../core/workouts';
import type { PlanState } from '../data/store';

export default function HomePage({ nav, plan, planState }: { nav: Nav; plan?: Plan; planState?: PlanState }) {
  const today = useToday();
  const settings = useSettings();
  const entries = useEntries() ?? [];
  const blocks = useWeekSchedule(today, settings.readSchedule);
  const [moving, setMoving] = useState<string>();
  const line = lineFor(today);

  const monday = mondayOnOrBefore(today);
  const dates = weekDates(today);
  const thisWeeks = entries.filter((entry) => entry.date >= dates[0] && entry.date <= dates[6]);
  const lastWeeks = entries.filter((entry) => entry.date >= addDays(monday, -7) && entry.date < monday);

  const resting = planState?.restWeek === monday;
  const week = plan && planState && !resting ? weekAt(plan, planState.week) : undefined;
  const newWeek = planState && planState.weekOf < monday;
  const finished = Boolean(plan && planState && isLastWeek(plan, planState.week) && newWeek);
  const hardLastWeek = lastWeeks.filter((entry) => entry.felt === 'hard').length >= 2;

  const days: DayPlan[] = useMemo(
    () =>
      week && planState
        ? layOut(week, today, planState.weekdays, planState.moves, thisWeeks, blocks).map((day) => ({
            ...day,
            workout: day.date === today ? asToday(day.workout, planState.lighter, today) : day.workout,
          }))
        : [],
    [week, planState, today, thisWeeks.length, blocks],
  );
  const comeBack =
    planState && !newWeek
      ? comeBackOffer(entries, planState.week, today, planState.comeBackAsked, planState.startedOn)
      : undefined;
  const focus =
    days.find((day) => day.date === today && !day.done) ?? days.find((day) => day.date > today && !day.done);

  const move = (workoutId: string, date: string) => {
    if (!planState) return;
    updatePlan({ moves: { ...planState.moves, [workoutId]: date } });
    setMoving(undefined);
  };

  return (
    <div className="home">
      <Hero image={scene('lake-trail')} tall>
        <Brand light />
        <div className="home__words">
          <p className="home__greeting">{greeting()}</p>
          <h1 className="home__title">One run at a time.</h1>
          <p className="home__sub">Small, steady effort, repeated.</p>
        </div>
      </Hero>

      <div className="page page--under-hero">
        {resting && planState ? (
          <section className="card" aria-label="A week of rest">
            <h2 className="card__title">A week of rest.</h2>
            <p className="muted">Nothing planned.</p>
            <button type="button" className="button-quiet" onClick={() => updatePlan({ restWeek: undefined })}>
              Back to the plan this week
            </button>
          </section>
        ) : !plan || !planState || !week ? (
          <section className="card">
            <h2 className="card__title">Set your aim</h2>
            <p className="muted">A time, a distance, or just to keep running.</p>
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'plan' })}>
              Set your aim
            </button>
          </section>
        ) : (
          <>
            {comeBack && (
              <section className="card card--offer" aria-label="Coming back">
                <h2 className="card__title">Good to see you.</h2>
                <p className="muted">
                  It has been {gapWords(comeBack.gapDays)}. Week {comeBack.toWeek} is there to ease back in, or carry on.
                </p>
                <div className="button-row">
                  <button
                    type="button"
                    className="button-main"
                    onClick={() =>
                      updatePlan({ week: comeBack.toWeek, weekOf: monday, moves: {}, comeBackAsked: comeBack.lastDate })
                    }
                  >
                    Start at week {comeBack.toWeek}
                  </button>
                  <button
                    type="button"
                    className="button-quiet"
                    onClick={() => updatePlan({ comeBackAsked: comeBack.lastDate })}
                  >
                    Carry on at week {comeBack.fromWeek}
                  </button>
                </div>
              </section>
            )}

            {newWeek && (
              <section className="card card--offer" aria-label="A new week">
                {finished ? (
                  <LookBack nav={nav} plan={plan} state={planState} entries={entries} today={today} />
                ) : (
                  <>
                    <h2 className="card__title">Week {planState.week + 1} is ready.</h2>
                    <p className="muted">
                      {hardLastWeek
                        ? `Two or more runs last week felt hard. Staying on week ${planState.week} for another go is an option.`
                        : `${weekAt(plan, planState.week + 1).theme}. Or stay on week ${planState.week} a little longer.`}
                    </p>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button-main"
                        onClick={() => updatePlan({ week: planState.week + 1, weekOf: monday, moves: {} })}
                      >
                        Start week {planState.week + 1}
                      </button>
                      <button
                        type="button"
                        className="button-quiet"
                        onClick={() => updatePlan({ weekOf: monday, moves: {} })}
                      >
                        Stay on week {planState.week}
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}

            <button type="button" className="card card--link" onClick={() => nav.swap({ name: 'train' })}>
              <span className="card__eyebrow">{planState.aimWords ?? aimWords(plan.aim, settings.unit)}</span>
              <span className="card__title">{week.stage}</span>
              <span className="muted">{week.theme}</span>
              <span className="card__foot">
                Week {week.n}
                {plan.cycleFrom ? '' : ` of ${plan.weeks.length}`}
                <ChevronIcon size={18} />
              </span>
            </button>

            <section className="card" aria-label="Today’s focus">
              <span className="card__eyebrow">
                {focus?.date === today ? 'Today’s focus' : focus ? `Next: ${dayLabel(focus.date, today)}` : 'This week'}
              </span>
              {focus ? (
                <>
                  <button
                    type="button"
                    className="focus"
                    onClick={() => nav.go({ name: 'workout', id: focus.workout.id })}
                  >
                    <img className="focus__image" src={scene(kindScene[focus.workout.kind])} alt="" />
                    <span className="focus__text">
                      <span className="focus__title">{focus.workout.title}</span>
                      <span className="focus__facts">
                        {focus.workout.kind !== 'race' && (
                          <span>
                            <ClockIcon size={15} /> {lengthLabel(totalMinutes(focus.workout.parts))}
                          </span>
                        )}
                        <span>
                          <PulseIcon size={15} /> {efforts[mainEffort(focus.workout.parts)].name}
                        </span>
                      </span>
                    </span>
                    <ChevronIcon size={18} />
                  </button>
                  {focus.date === today && (
                    <div className="button-row">
                      <button
                        type="button"
                        className="button-main"
                        onClick={() => nav.go({ name: 'workout', id: focus.workout.id })}
                      >
                        Start
                      </button>
                      <button
                        type="button"
                        className="button-quiet"
                        onClick={() => nav.go({ name: 'entry', workoutId: focus.workout.id, date: focus.date })}
                      >
                        Log it
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="muted">Nothing left this week.</p>
              )}
            </section>

            <section aria-label="This week" className="week-list">
              <h2 className="label">This week</h2>
              {days.map((day) => (
                <div
                  key={day.workout.id}
                  className={`week-row${day.date < today && !day.done ? ' week-row--passed' : ''}`}
                >
                  <div className="week-row__line">
                    <button
                      type="button"
                      className="week-row__main"
                      onClick={() => nav.go({ name: 'workout', id: day.workout.id })}
                    >
                      <span className={`week-row__day${day.date === today ? ' week-row__day--today' : ''}`}>
                        {dayLabel(day.date, today)}
                      </span>
                      <span className="week-row__what">
                        {day.workout.title}
                        {day.workout.kind !== 'race' && (
                          <span className="week-row__len"> · {lengthLabel(totalMinutes(day.workout.parts))}</span>
                        )}
                        <span className="week-row__summary">{day.workout.summary}</span>
                      </span>
                      <span className="week-row__felt">
                        {day.done ? (day.done.felt ? feelings[day.done.felt] : 'Done') : ''}
                      </span>
                    </button>
                    {!day.done && day.date <= today && (
                      <button
                        type="button"
                        className="chip week-row__log"
                        aria-label={`Log ${day.workout.title}, ${dayLabel(day.date, today)}`}
                        onClick={() => nav.go({ name: 'entry', workoutId: day.workout.id, date: day.date })}
                      >
                        Log
                      </button>
                    )}
                  </div>
                  {day.note && !day.done && (
                    <p className="week-row__note">
                      {day.note}.{' '}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setMoving(moving === day.workout.id ? undefined : day.workout.id)}
                      >
                        Move it
                      </button>
                    </p>
                  )}
                  {moving === day.workout.id && (
                    <div className="chip-row" role="group" aria-label="Move to">
                      {freeDaysThisWeek(days, today, blocks).map((date) => (
                        <button key={date} type="button" className="chip" onClick={() => move(day.workout.id, date)}>
                          {dayLabel(date, today)}
                        </button>
                      ))}
                      <button type="button" className="chip" onClick={() => setMoving(undefined)}>
                        Leave it
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {days.length === 0 && <p className="muted">No sessions this week.</p>}
            </section>
          </>
        )}

        {settings.dailyLine && (
          <figure className="daily-line">
            <blockquote>{line.text}</blockquote>
            <figcaption>{line.by}</figcaption>
          </figure>
        )}
      </div>
    </div>
  );
}
