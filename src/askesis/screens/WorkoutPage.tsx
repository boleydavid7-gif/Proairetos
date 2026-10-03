import { useState } from 'react';
import { mondayOnOrBefore } from '../../core/scheduling/dates';
import type { Nav } from '../app/App';
import { kindScene, scene } from '../app/scenes';
import { useEntries, useSettings, useToday } from '../app/state';
import { BackLink, dayLabel, Hero } from '../app/ui';
import SessionBar, { SessionKey } from '../app/SessionBar';
import { efforts } from '../core/effort';
import { feelings } from '../core/log';
import { defaultWeekdays, examplePath, findWorkout, type Plan } from '../core/plans';
import { sessionWeekdays, weekdayNames } from '../core/week';
import { intentionPrompt, raceDayLine } from '../core/stoic';
import { isSet, lengthLabel, mainEffort, partLabel, sessionLines, totalMinutes, type Part } from '../core/workouts';
import { heartRange } from '../core/zones';
import type { PlanState } from '../data/store';
import { asToday, canLighten } from '../core/gentler';
import { updatePlan } from '../app/state';

/** Finds a session in the person's plan, or in any plan when browsing. */
/** Finds a session in the person's path, or in the example path shown before an aim is set. */
function locate(id: string, plan: Plan | undefined) {
  const found = plan && findWorkout(plan, id);
  if (found) return { ...found, plan };
  const example = examplePath();
  const hit = findWorkout(example, id);
  return hit && { ...hit, plan: example };
}

export { locate };

export default function WorkoutPage({ nav, id, plan, planState }: { nav: Nav; id: string; plan?: Plan; planState?: PlanState }) {
  const settings = useSettings();
  const today = useToday();
  const entries = useEntries() ?? [];
  const [intention, setIntention] = useState('');
  const found = locate(id, plan);
  if (!found)
    return (
      <div className="page">
        <BackLink label="Back" onBack={nav.back} />
        <p className="muted">This session is not in your plan any more.</p>
      </div>
    );
  const { week } = found;
  const full = found.workout;
  const workout = asToday(full, planState?.lighter, today);
  const lighter = workout !== full;
  const index = week.workouts.indexOf(full) + 1;
  const done = planState?.week === week.n ? entries.find((entry) => entry.workoutId === full.id && entry.date >= mondayOnOrBefore(today)) : undefined;
  const race = workout.kind === 'race';
  const mine = Boolean(plan && planState && found.plan.id === plan.id);
  const effort = mainEffort(workout.parts);
  const weekday = weekdayNames[sessionWeekdays(mine && planState ? planState.weekdays : defaultWeekdays(found.plan.days), found.plan.days)[index - 1]];

  return (
    <div className="workout">
      <Hero image={scene(kindScene[workout.kind])}>
        <BackLink label="Back" onBack={nav.back} />
      </Hero>
      <div className="page page--under-hero">
        <h1 className="title">{workout.title}</h1>
        <p className="muted">
          {[!race && lengthLabel(totalMinutes(workout.parts)), weekday, `Week ${week.n}`].filter(Boolean).join(' · ')}
        </p>
        {mine && planState?.why && <p className="own-words">“{planState.why}”</p>}

        {race ? (
          <p className="card stoic-note">{raceDayLine}</p>
        ) : (
          <>
            <SessionBar parts={workout.parts} />
            <SessionKey parts={workout.parts} />
            <ol className="session-lines">
              {sessionLines(workout.parts).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
            <p className="muted">
              {efforts[effort].name}: {efforts[effort].talk.charAt(0).toLowerCase() + efforts[effort].talk.slice(1)}
            </p>
          </>
        )}

        {done && (
          <button type="button" className="card card--link done-note" onClick={() => nav.go({ name: 'entry', id: done.id })}>
            Done {dayLabel(done.date, today).toLowerCase()}
            {done.felt ? ` · ${feelings[done.felt]}` : ''}
          </button>
        )}

        <div className="session-start">
          {!race && (
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'guide', id: workout.id, intention: intention.trim() || undefined })}>
              Start
            </button>
          )}
          <div className="link-row">
            <button
              type="button"
              className={race ? 'button-main' : 'text-link'}
              onClick={() => nav.go({ name: 'entry', workoutId: workout.id, intention: intention.trim() || undefined })}
            >
              {race ? 'Log your race' : 'Log it'}
            </button>
            {mine && !done && (lighter || canLighten(full)) && (
              <button
                type="button"
                className="text-link"
                onClick={() => updatePlan({ lighter: lighter ? undefined : { date: today, workoutId: full.id } })}
              >
                {lighter ? 'Back to the full session' : 'Lighter today'}
              </button>
            )}
          </div>
          {lighter && <p className="hint">Just for today.</p>}
        </div>

        {!race && (
          <details className="more-about">
            <summary>Step by step</summary>
            <ol className="steps">
              {workout.parts.map((part, i) => (
                <StepRow key={i} part={part} heart={settings} />
              ))}
            </ol>
          </details>
        )}
        <details className="more-about">
          <summary>Why it’s here</summary>
          <p>{workout.why}</p>
        </details>
        <details className="more-about">
          <summary>Tips</summary>
          <ul className="tips">
            {workout.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </details>
        <details className="more-about">
          <summary>{intentionPrompt}</summary>
          <input
            className="input"
            aria-label={intentionPrompt}
            value={intention}
            placeholder="Optional. For example: an easy start."
            onChange={(event) => setIntention(event.target.value)}
          />
        </details>
      </div>
    </div>
  );
}

function StepRow({ part, heart }: { part: Part; heart: { age?: number; maxHr?: number; restingHr?: number } }) {
  if (isSet(part))
    return (
      <li className="steps__set">
        <span className="steps__repeat">{part.repeat} times</span>
        <ol className="steps steps--inner">
          {part.steps.map((inner, i) => (
            <StepRow key={i} part={inner} heart={heart} />
          ))}
        </ol>
      </li>
    );
  const range = heartRange(part.effort, heart);
  return (
    <li className={`steps__step steps__step--${part.effort}`}>
      <span className="steps__name">{part.note ? `${part.note}: ` : ''}{partLabel(part)}</span>
      <span className="steps__hint">
        {efforts[part.effort].talk}
        {range ? ` · ${range[0]}–${range[1]} bpm` : ''}
      </span>
    </li>
  );
}
