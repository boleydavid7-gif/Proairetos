import { useState } from 'react';
import type { Nav } from '../app/App';
import { CheckIcon, ChevronIcon } from '../app/icons';
import { useSettings } from '../app/state';
import { Brand } from '../app/ui';
import { aimWords, defaultWeekdays, examplePath, stagesOf, weekMinutes, type Plan, type PlanWeek } from '../core/plans';
import { sessionWeekdays, weekdayNames } from '../core/week';
import { lengthLabel, totalMinutes } from '../core/workouts';
import type { PlanState } from '../data/store';

/**
 * The whole path, one continuous line of weeks grouped by stage. Every week
 * is open to look at and to repeat; nothing is locked.
 */
export default function TrainPage({ nav, plan, planState }: { nav: Nav; plan?: Plan; planState?: PlanState }) {
  const settings = useSettings();
  const shown = plan ?? examplePath();
  const current = plan && planState ? planState.week : undefined;
  // In a steady rhythm past the last listed week, the week shown is its place in the rhythm.
  const currentListed = current && shown.cycleFrom && current > shown.weeks.length
    ? shown.cycleFrom + ((current - shown.cycleFrom) % (shown.weeks.length - shown.cycleFrom + 1))
    : current;
  const [open, setOpen] = useState<number | undefined>(currentListed);
  const sessionDays = sessionWeekdays(planState ? planState.weekdays : defaultWeekdays(shown.days), shown.days);

  const row = (week: PlanWeek) => {
    const here = currentListed === week.n;
    const past = currentListed !== undefined && week.n < currentListed;
    return (
      <li key={week.n} className={`weeks__item${here ? ' weeks__item--current' : ''}`}>
        <button type="button" className="weeks__head" aria-expanded={open === week.n} onClick={() => setOpen(open === week.n ? undefined : week.n)}>
          <span className={`weeks__dot${past ? ' weeks__dot--past' : ''}${here ? ' weeks__dot--current' : ''}`} aria-hidden="true">
            {past && <CheckIcon size={14} />}
          </span>
          <span className="weeks__text">
            <span className="weeks__name">
              Week {here && current ? current : week.n}
              {here && <span className="weeks__here"> · this week</span>}
            </span>
            <span className="weeks__theme">
              {week.theme} · {lengthLabel(weekMinutes(week))}
            </span>
          </span>
          <ChevronIcon size={18} className={open === week.n ? 'turned' : undefined} />
        </button>
        {open === week.n && (
          <ul className="weeks__sessions">
            {week.workouts.map((workout, i) => (
              <li key={workout.id}>
                <button type="button" className="session-row" onClick={() => nav.go({ name: 'workout', id: workout.id })}>
                  <span className="session-row__day">{weekdayNames[sessionDays[i]].slice(0, 3)}</span>
                  <span className="session-row__main">
                    <span className="session-row__title">{workout.title}</span>
                    <span className="session-row__summary">{workout.summary}</span>
                  </span>
                  <span className="session-row__len">{workout.kind === 'race' ? '' : lengthLabel(totalMinutes(workout.parts))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="page">
      <Brand />
      <h1 className="title">Train</h1>
      <p className="lead">{plan ? (planState?.aimWords ?? aimWords(plan.aim, settings.unit)) : 'An example: a 10K, three days a week.'}</p>

      {stagesOf(shown).map((stage) => (
        <section key={`${stage.stage}-${stage.from}`} className="stage" aria-label={stage.stage}>
          <div className="stage__head">
            <h2 className="stage__name">{stage.stage}</h2>
            <span className="stage__weeks">
              {stage.from === stage.to ? `Week ${stage.from}` : `Weeks ${stage.from}–${stage.to}`}
            </span>
          </div>
          <ol className="weeks">{shown.weeks.filter((week) => week.n >= stage.from && week.n <= stage.to).map(row)}</ol>
        </section>
      ))}

      <button type="button" className={plan ? 'button-quiet' : 'button-main'} onClick={() => nav.go({ name: 'plan' })}>
        {plan ? 'Change your aim' : 'Set your aim'}
      </button>
    </div>
  );
}
