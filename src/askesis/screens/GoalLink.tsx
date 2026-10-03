import { useEffect, useState } from 'react';
import { compassService, scheduleService } from '../../app/services';
import { goalSchedule, readWeekly, type Weekday } from '../../core/compass/goalTime';
import type { SchedulePattern } from '../../core/scheduling/types';
import type { CompassStatement } from '../../core/compass/types';
import { updatePlan, useToday } from '../app/state';
import { Switch, useUndo } from '../app/ui';
import type { Goal } from '../core/plans';
import type { PlanState } from '../data/store';

const goalWords: Record<Goal, string> = {
  'run-30': 'Run 30 minutes without stopping',
  '10k': 'Run a 10K',
  half: 'Run a half marathon',
  marathon: 'Run a marathon',
};

/**
 * The plan's aim as a Proairetos goal ("Working toward" in Compass), and, if
 * chosen, time protected for it on the run days. Offered, never required;
 * nothing checks whether the time was used.
 */
export default function GoalLink({ plan }: { plan: PlanState }) {
  const today = useToday();
  const undo = useUndo();
  const [goal, setGoal] = useState<CompassStatement | null>();
  const [words, setWords] = useState(goalWords[plan.goal]);
  const [protect, setProtect] = useState(true);
  const [start, setStart] = useState('07:00');
  const [end, setEnd] = useState('08:00');

  useEffect(() => {
    if (!plan.goalId) return setGoal(null);
    void compassService.statements().then((all) => setGoal(all.find((each) => each.id === plan.goalId) ?? null));
  }, [plan.goalId]);

  const add = async () => {
    const created = await compassService.addGoal(words.trim() || goalWords[plan.goal]);
    let patternId: string | undefined;
    if (protect && end > start) {
      const pattern = await scheduleService.createPattern(
        goalSchedule(created, { days: plan.weekdays as Weekday[], start, end }, today),
      );
      patternId = pattern.id;
      await compassService.updateGoal(created.id, { patternId });
    }
    updatePlan({ goalId: created.id });
    undo('Added to Compass', () => {
      void (async () => {
        if (patternId) await scheduleService.removePattern(patternId);
        await compassService.removeStatement(created.id);
        updatePlan({ goalId: undefined });
      })();
    });
  };

  if (goal === undefined) return null;
  if (goal)
    return (
      <section className="card">
        <span className="card__eyebrow">In Proairetos</span>
        <h2 className="card__title card__title--small">{goal.body}</h2>
        <p className="muted">
          Working toward, in Compass{goal.patternId ? ', with time set aside on your run days' : ''}.
        </p>
        <a className="text-link" href="/">
          Open Proairetos
        </a>
      </section>
    );
  return (
    <section className="card">
      <span className="card__eyebrow">In Proairetos, if you like</span>
      <h2 className="card__title card__title--small">Add it to Compass</h2>
      <p className="muted">As something you are working toward, beside your values.</p>
      <input className="input" aria-label="The goal, in your words" value={words} onChange={(event) => setWords(event.target.value)} />
      <Switch
        on={protect}
        label="Make time for this"
        detail="Protected time on your run days: notifications wait, and open time leaves it free."
        onToggle={() => setProtect(!protect)}
      />
      {protect && (
        <div className="time-boxes">
          <input className="input" type="time" aria-label="From" value={start} onChange={(event) => setStart(event.target.value)} />
          <span aria-hidden="true">to</span>
          <input className="input" type="time" aria-label="Until" value={end} onChange={(event) => setEnd(event.target.value)} />
        </div>
      )}
      <button type="button" className="button-quiet" onClick={() => void add()}>
        Add to Compass
      </button>
    </section>
  );
}

const inputOf = (pattern: SchedulePattern) => {
  const { name, kind, layout, anchorDate, segments, endDate, pauseWhenEnds, color, location } = pattern;
  return structuredClone({ name, kind, layout, anchorDate, segments, endDate, pauseWhenEnds, color, location });
};

/**
 * When the run days change, the goal's protected time moves with them (same
 * hours). Returns a way to put it back, or nothing if there was nothing to move.
 */
export async function moveGoalTime(goalId: string | undefined, days: number[], today: string): Promise<(() => Promise<void>) | undefined> {
  if (!goalId) return undefined;
  const goal = (await compassService.statements()).find((each) => each.id === goalId);
  const pattern = goal?.patternId ? await scheduleService.getPattern(goal.patternId) : null;
  const weekly = pattern && readWeekly(pattern);
  if (!goal || !pattern || !weekly) return undefined;
  const before = inputOf(pattern);
  const moved = goalSchedule(goal, { days: days as Weekday[], start: weekly.start, end: weekly.end }, today);
  await scheduleService.updatePattern(pattern.id, { ...before, ...moved, color: pattern.color ?? moved.color });
  return async () => {
    await scheduleService.updatePattern(pattern.id, before);
  };
}
