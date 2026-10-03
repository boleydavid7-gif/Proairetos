import { useState } from 'react';
import { mondayOnOrBefore } from '../../core/scheduling/dates';
import type { Nav } from '../app/App';
import { ClockIcon, ListIcon, PulseIcon } from '../app/icons';
import { kindScene, scene } from '../app/scenes';
import { useEntries, useSettings, useToday } from '../app/state';
import { BackLink, dayLabel, Hero, Segmented } from '../app/ui';
import { efforts } from '../core/effort';
import { feelings } from '../core/log';
import { defaultWeekdays, examplePath, findWorkout, type Plan } from '../core/plans';
import { sessionWeekdays, weekdayNames } from '../core/week';
import { intentionPrompt, raceDayLine } from '../core/stoic';
import { isSet, lengthLabel, mainEffort, partLabel, totalMinutes, type Part } from '../core/workouts';
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
  const [tab, setTab] = useState<'tips' | 'why'>('why');
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

  return (
    <div className="workout">
      <Hero image={scene(kindScene[workout.kind])}>
        <BackLink label="Back" onBack={nav.back} />
      </Hero>
      <div className="page page--under-hero">
        <h1 className="title">{workout.title}</h1>
        <p className="muted">
          Week {week.n} · {weekdayNames[sessionWeekdays(mine && planState ? planState.weekdays : defaultWeekdays(found.plan.days), found.plan.days)[index - 1]]} ·{' '}
          {week.stage}
        </p>

        <ul className="facts">
          {!race && (
            <li>
              <ClockIcon size={18} /> {lengthLabel(totalMinutes(workout.parts))}
            </li>
          )}
          <li>
            <PulseIcon size={18} /> {efforts[effort].name}: {efforts[effort].talk.toLowerCase()}
          </li>
          <li>
            <ListIcon size={18} /> {workout.summary}
          </li>
        </ul>

        {done && (
          <button type="button" className="card card--link done-note" onClick={() => nav.go({ name: 'entry', id: done.id })}>
            Done {dayLabel(done.date, today).toLowerCase()}
            {done.felt ? ` · ${feelings[done.felt]}` : ''}
          </button>
        )}

        {race && <p className="card stoic-note">{raceDayLine}</p>}

        {!race && (
          <section className="card" aria-label="The session">
            <h2 className="card__title card__title--small">The session</h2>
            <ol className="steps">
              {workout.parts.map((part, i) => (
                <StepRow key={i} part={part} heart={settings} />
              ))}
            </ol>
          </section>
        )}

        <Segmented
          label="About this session"
          value={tab}
          options={[
            { id: 'why', label: 'Why it’s here' },
            { id: 'tips', label: 'Tips' },
          ]}
          onChange={setTab}
          small
        />
        <div className="card">
          {tab === 'why' ? (
            <p>{workout.why}</p>
          ) : (
            <ul className="tips">
              {workout.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
        </div>

        <label className="field">
          <span className="label">{intentionPrompt}</span>
          <input
            className="input"
            value={intention}
            placeholder="Optional. For example: an easy start."
            onChange={(event) => setIntention(event.target.value)}
          />
        </label>

        <div className="actions">
          {!race && (
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'guide', id: workout.id, intention: intention.trim() || undefined })}>
              Start with the guide
            </button>
          )}
          <button
            type="button"
            className={race ? 'button-main' : 'button-quiet'}
            onClick={() => nav.go({ name: 'entry', workoutId: workout.id, intention: intention.trim() || undefined })}
          >
            {race ? 'Log your race' : 'I did it on my own · Log it'}
          </button>
          {mine && !done && (lighter || canLighten(full)) && (
            <button
              type="button"
              className="text-link lighter-link"
              onClick={() => updatePlan({ lighter: lighter ? undefined : { date: today, workoutId: full.id } })}
            >
              {lighter ? 'Back to the full session' : 'Lighter today'}
            </button>
          )}
        </div>
        {lighter && <p className="hint">Just for today.</p>}
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
