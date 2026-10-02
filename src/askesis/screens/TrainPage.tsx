import { useState } from 'react';
import type { Nav } from '../app/App';
import { CheckIcon, ChevronIcon } from '../app/icons';
import { Brand, Segmented } from '../app/ui';
import { buildPlan, daysFor, goals, levels, weekMinutes, type Level, type Plan } from '../core/plans';
import { lengthLabel, totalMinutes } from '../core/workouts';
import type { PlanState } from '../data/store';

/** Every plan, every week, open to look at. Nothing is locked. */
export default function TrainPage({ nav, plan, planState }: { nav: Nav; plan?: Plan; planState?: PlanState }) {
  const [level, setLevel] = useState<Level>(plan?.level ?? 'beginner');
  const shown = plan && plan.level === level ? plan : buildPlan({ level, days: daysFor(level)[0] });
  const mine = plan && shown.id === plan.id;
  const [open, setOpen] = useState<number | undefined>(mine ? planState?.week : undefined);

  return (
    <div className="page">
      <Brand />
      <h1 className="title">Train</h1>
      <p className="lead">Structured plans for every level. Every week is open; repeat any of them.</p>
      <Segmented
        label="Level"
        value={level}
        options={(Object.keys(levels) as Level[]).map((id) => ({ id, label: levels[id].name }))}
        onChange={(next) => {
          setLevel(next);
          setOpen(plan?.level === next ? planState?.week : undefined);
        }}
      />
      <p className="muted plan-line">
        {levels[level].line} {shown.weeks.length} weeks
        {level === 'advanced' ? `, ${goals[shown.goal].name.toLowerCase()}` : ''}, {shown.days} days a week.
      </p>

      <ol className="weeks">
        {shown.weeks.map((week) => {
          const current = mine && planState?.week === week.n;
          const past = mine && planState && week.n < planState.week;
          return (
            <li key={week.n} className={`weeks__item${current ? ' weeks__item--current' : ''}`}>
              <button
                type="button"
                className="weeks__head"
                aria-expanded={open === week.n}
                onClick={() => setOpen(open === week.n ? undefined : week.n)}
              >
                <span className={`weeks__dot${past ? ' weeks__dot--past' : ''}${current ? ' weeks__dot--current' : ''}`} aria-hidden="true">
                  {past && <CheckIcon size={14} />}
                </span>
                <span className="weeks__text">
                  <span className="weeks__name">
                    Week {week.n}
                    {current && <span className="weeks__here"> · this week</span>}
                  </span>
                  <span className="weeks__theme">
                    {week.theme} · {lengthLabel(weekMinutes(week))}
                  </span>
                </span>
                <ChevronIcon size={18} className={open === week.n ? 'turned' : undefined} />
              </button>
              {open === week.n && (
                <ul className="weeks__sessions">
                  {week.workouts.map((workout) => (
                    <li key={workout.id}>
                      <button type="button" className="session-row" onClick={() => nav.go({ name: 'workout', id: workout.id })}>
                        <span>
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
        })}
      </ol>

      {!mine && (
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'plan', level })}>
          Use the {levels[level].name.toLowerCase()} plan
        </button>
      )}
    </div>
  );
}
