import { useState } from 'react';
import { compassService } from '../../app/services';
import { addDays, mondayOnOrBefore } from '../../core/scheduling/dates';
import type { Nav } from '../app/App';
import { pathFor, startPlan, updatePlan } from '../app/state';
import { useUndo } from '../app/ui';
import type { LogEntry } from '../core/log';
import { formatHours } from '../core/pace';
import { aimWords, joinWeekFor, type Plan } from '../core/plans';
import type { PlanState } from '../data/store';

/**
 * The aim's week has passed. No praise, no badge: where the path began,
 * where it is now, from the log; then three choices, all equal.
 */
export default function LookBack({
  nav,
  plan,
  state,
  entries,
  today,
}: {
  nav: Nav;
  plan: Plan;
  state: PlanState;
  entries: readonly LogEntry[];
  today: string;
}) {
  const undo = useUndo();
  const [reached, setReached] = useState(false);
  const since = entries.filter((entry) => entry.date >= state.startedOn);
  const seconds = since.reduce((sum, entry) => sum + (entry.seconds ?? 0), 0);
  const first = plan.weeks[Math.max(1, state.joinWeek) - 1]?.workouts.find((w) => w.kind !== 'walk');
  const last = plan.weeks[plan.weeks.length - 1]?.workouts.find((w) => w.kind === 'race' || w.kind === 'long') ?? plan.weeks[plan.weeks.length - 1]?.workouts.at(-1);
  const monday = mondayOnOrBefore(today);

  // Recent weekly time, to place a steady path where the person is now.
  const recent = entries.filter((entry) => entry.date >= addDays(monday, -14) && entry.date < monday);
  const weekly = recent.reduce((sum, entry) => sum + (entry.seconds ?? 0), 0) / 60 / 2;

  const keepRunning = () => {
    const before = state;
    const steady = { aim: { kind: 'steady' as const }, days: state.days };
    const path = pathFor({ ...state, ...steady, raceDate: undefined, joinWeek: 1 });
    startPlan({ ...steady, weekdays: state.weekdays, week: joinWeekFor(path, weekly || 120) }, today, { goalId: state.goalId });
    undo('Keeping a steady rhythm', () => updatePlan(before));
  };

  return (
    <section className="card card--offer look-back" aria-label="Your aim">
      <span className="card__eyebrow">{state.aimWords ?? aimWords(plan.aim)}</span>
      <h2 className="card__title">That was the week of your aim.</h2>
      <ul className="look-back__facts">
        {first && (
          <li>
            Where you began: week {state.joinWeek}, {first.summary.charAt(0).toLowerCase() + first.summary.slice(1)}.
          </li>
        )}
        {last && <li>The last week: {last.title.toLowerCase()}.</li>}
        <li>
          {since.length} {since.length === 1 ? 'workout' : 'workouts'} logged
          {seconds ? `, ${formatHours(seconds)} on your feet` : ''}.
        </li>
      </ul>
      <p className="muted">What comes next is up to you.</p>
      <div className="actions">
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'plan' })}>
          Set a new aim
        </button>
        <button type="button" className="button-quiet" onClick={keepRunning}>
          Just keep running
        </button>
        <button type="button" className="button-quiet" onClick={() => updatePlan({ restWeek: monday, weekOf: monday, moves: {} })}>
          Rest this week first
        </button>
      </div>
      {state.goalId && !reached && (
        <button
          type="button"
          className="text-link"
          onClick={async () => {
            await compassService.updateGoal(state.goalId!, { reachedAt: new Date().toISOString() });
            setReached(true);
          }}
        >
          Mark it reached in Compass
        </button>
      )}
      {reached && <p className="hint">Marked reached in Compass, with today’s date.</p>}
    </section>
  );
}
