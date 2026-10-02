import { useState } from 'react';
import type { Nav } from '../app/App';
import { startPlan, usePlanState, useSettings, useToday } from '../app/state';
import { BackLink, Segmented, useUndo } from '../app/ui';
import { buildPlan, daysFor, defaultWeekdays, goals, goalsFor, levels, type Goal, type Level } from '../core/plans';
import { savePlan, saveSettings } from '../data/store';

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Choosing a plan: first time, or any time after from More. */
export default function PlanPage({ nav, first, level: openLevel }: { nav: Nav; first?: boolean; level?: Level }) {
  const today = useToday();
  const settings = useSettings();
  const current = usePlanState();
  const undo = useUndo();
  const [level, setLevel] = useState<Level>(openLevel ?? current?.level ?? 'beginner');
  const [goal, setGoal] = useState<Goal>(current?.goal ?? goalsFor(level)[0]);
  const [days, setDays] = useState<number>(current?.days ?? daysFor(level)[0]);
  const [weekdays, setWeekdays] = useState<number[]>(current?.weekdays ?? defaultWeekdays(days));
  const [week, setWeek] = useState<number>(1);

  const allowedDays = daysFor(level);
  const goalChoice = goalsFor(level).includes(goal) ? goal : goalsFor(level)[0];
  const dayChoice = allowedDays.includes(days) ? days : allowedDays[0];
  const plan = buildPlan({ level, days: dayChoice, goal: goalChoice });
  const chosenDays = weekdays.length === dayChoice ? weekdays : defaultWeekdays(dayChoice);
  const same = current && current.level === level && current.goal === goalChoice && current.days === dayChoice;

  const pickLevel = (next: Level) => {
    setLevel(next);
    setGoal(goalsFor(next)[0]);
    const nextDays = daysFor(next).includes(days) ? days : daysFor(next)[0];
    setDays(nextDays);
    setWeekdays(defaultWeekdays(nextDays));
    setWeek(1);
  };
  const pickDays = (next: number) => {
    setDays(next);
    setWeekdays(defaultWeekdays(next));
  };
  const toggleDay = (day: number) => {
    const has = chosenDays.includes(day);
    if (has) setWeekdays(chosenDays.filter((d) => d !== day));
    else if (chosenDays.length < dayChoice) setWeekdays([...chosenDays, day].sort());
    else setWeekdays([...chosenDays.slice(1), day].sort());
  };

  const save = () => {
    const before = current;
    if (same && current) {
      // Same plan: only the days change; the week stays.
      savePlan({ ...current, weekdays: chosenDays, moves: {} });
    } else {
      startPlan({ level, goal: goalChoice, days: dayChoice, weekdays: chosenDays, week }, today);
      if (before) undo('Plan changed', () => savePlan(before));
    }
    if (first) {
      saveSettings({ ...settings, started: true });
      nav.swap({ name: 'home' });
    } else nav.back();
  };

  return (
    <div className="page">
      {!first && <BackLink label="More" onBack={nav.back} />}
      <h1 className="title">{first ? 'Choose your path' : 'Your plan'}</h1>
      <p className="lead">Pick where you are now. You can change it any time; what you have logged stays.</p>

      <div className="level-cards" role="group" aria-label="Level">
        {(Object.keys(levels) as Level[]).map((id) => (
          <button key={id} type="button" className="level-card" aria-pressed={level === id} onClick={() => pickLevel(id)}>
            <span className="level-card__name">{levels[id].name}</span>
            <span className="level-card__line">{levels[id].line}</span>
            <span className="level-card__who">{levels[id].who}</span>
          </button>
        ))}
      </div>

      {goalsFor(level).length > 1 && (
        <section className="field">
          <h2 className="label">Training for</h2>
          <Segmented
            label="Training for"
            value={goalChoice}
            options={goalsFor(level).map((id) => ({ id, label: goals[id].name }))}
            onChange={(next) => setGoal(next)}
          />
        </section>
      )}

      <section className="field">
        <h2 className="label">Days a week</h2>
        <Segmented
          label="Days a week"
          value={String(dayChoice)}
          options={allowedDays.map((d) => ({ id: String(d), label: `${d} days` }))}
          onChange={(next) => pickDays(Number(next))}
        />
      </section>

      <section className="field">
        <h2 className="label">Which days</h2>
        <div className="weekday-row" role="group" aria-label="Which days">
          {weekdayNames.map((name, day) => (
            <button key={name} type="button" className="weekday" aria-pressed={chosenDays.includes(day)} onClick={() => toggleDay(day)}>
              {name}
            </button>
          ))}
        </div>
        <p className="hint">
          The longest run goes on the last of these. If you use Proairetos here, days after a night of work are marked.
        </p>
      </section>

      {!same && plan.weeks.length > 1 && (
        <section className="field">
          <h2 className="label">Start at</h2>
          <div className="stepper">
            <button type="button" className="stepper__button" aria-label="Earlier week" onClick={() => setWeek(Math.max(1, week - 1))}>
              −
            </button>
            <span className="stepper__value">
              Week {week} of {plan.weeks.length}
            </span>
            <button
              type="button"
              className="stepper__button"
              aria-label="Later week"
              onClick={() => setWeek(Math.min(plan.weeks.length, week + 1))}
            >
              +
            </button>
          </div>
          <p className="hint">{plan.weeks[week - 1].theme}. Week 1 is a good place to start for most people.</p>
        </section>
      )}

      {first && (
        <section className="field">
          <h2 className="label">Distances in</h2>
          <Segmented
            label="Distances in"
            value={settings.unit}
            options={[
              { id: 'mi', label: 'Miles' },
              { id: 'km', label: 'Kilometres' },
            ]}
            onChange={(unit) => saveSettings({ ...settings, unit })}
          />
        </section>
      )}

      <button type="button" className="button-main" onClick={save}>
        {first ? 'Begin' : same ? 'Keep these days' : `Start ${levels[level].name.toLowerCase()} plan`}
      </button>
    </div>
  );
}
