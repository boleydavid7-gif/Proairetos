import { useState, type FormEvent } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, lifeService, scheduleService } from '../../app/services';
import ColorChoice from '../../components/ui/ColorChoice';
import { goalSchedule, readWeekly, type Weekday, type WeeklyTime } from '../../core/compass/goalTime';
import { toLocalDate } from '../../core/scheduling/dates';
import type { SchedulePattern } from '../../core/scheduling/types';
import type { PatternInput } from '../../services/schedule/scheduleService';
import { formatTimeOf, weekdayNames } from '../schedule/format';
import { goalRecord } from '../../core/compass/goals';
import { MAX_GOALS, type CompassStatement } from '../../core/compass/types';
import { dayLabel } from '../reflect/format';

const DONE_SHOWN = 5;

function subscribeItems(listener: () => void) {
  return lifeService.subscribe(listener);
}

const clock = (time: string) => formatTimeOf(new Date(`2026-01-05T${time}:00`));

/** "Tue, Thu · 7:00 PM–8:00 PM" */
export function describeWeekly(time: WeeklyTime): string {
  return `${time.days.map((day) => weekdayNames[day].slice(0, 3)).join(', ')} · ${clock(time.start)}–${clock(time.end)}`;
}

function inputOf(pattern: SchedulePattern): PatternInput {
  const { name, kind, layout, anchorDate, segments, endDate, pauseWhenEnds, color, location } = pattern;
  return structuredClone({ name, kind, layout, anchorDate, segments, endDate, pauseWhenEnds, color, location });
}

function subscribeTime(listener: () => void) {
  return scheduleService.subscribe(listener);
}

/**
 * Time set aside for a goal, as weekly protected time. Shown with its next
 * occurrence; never counted or checked against.
 */
function GoalTime({ goal }: { goal: CompassStatement }) {
  const { offerUndo } = useOverlays();
  const info = useServiceData(
    subscribeTime,
    async () => {
      const pattern = goal.patternId ? await scheduleService.getPattern(goal.patternId) : null;
      if (!pattern) return { pattern: null, next: undefined };
      const now = new Date();
      const next = (await scheduleService.occurrencesBetween(now, new Date(now.getTime() + 8 * 86_400_000)))
        .filter((block) => block.patternId === pattern.id && block.end > now)
        .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
      return { pattern, next };
    },
    [goal.patternId],
  );
  const current = info?.pattern ? readWeekly(info.pattern) : undefined;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WeeklyTime>(current ?? { days: [], start: '19:00', end: '20:00' });
  const [error, setError] = useState('');

  async function save() {
    setError('');
    try {
      const input = goalSchedule(goal, draft, toLocalDate(new Date()));
      if (info?.pattern) {
        await scheduleService.updatePattern(info.pattern.id, { ...inputOf(info.pattern), ...input, color: info.pattern.color ?? input.color });
      } else {
        const pattern = await scheduleService.createPattern(input);
        await compassService.updateGoal(goal.id, { patternId: pattern.id });
      }
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that time.');
    }
  }

  async function stop() {
    if (!info?.pattern) return;
    const saved = inputOf(info.pattern);
    await scheduleService.removePattern(info.pattern.id);
    await compassService.updateGoal(goal.id, { patternId: null });
    offerUndo('Time no longer set aside', async () => {
      const pattern = await scheduleService.createPattern(saved);
      await compassService.updateGoal(goal.id, { patternId: pattern.id });
    });
  }

  if (editing) {
    return (
      <div className="goal-time goal-time--editing">
        <p className="sheet__label">Time for this, each week</p>
        <div className="chip-row" role="group" aria-label="Days">
          {weekdayNames.map((name, index) => {
            const day = index as Weekday;
            const on = draft.days.includes(day);
            return (
              <button
                key={name}
                type="button"
                className="chip chip--small"
                aria-pressed={on}
                aria-label={name}
                onClick={() => setDraft({ ...draft, days: on ? draft.days.filter((d) => d !== day) : [...draft.days, day].sort() })}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
        <div className="block-fields">
          <label className="block-fields__time">
            <span>From</span>
            <input type="time" className="field-input" aria-label="From" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
          </label>
          <label className="block-fields__time">
            <span>Until</span>
            <input type="time" className="field-input" aria-label="Until" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
          </label>
        </div>
        <p className="sheet__hint">It becomes protected time: reminders wait during it, and it shows on your days. Nothing checks whether you used it.</p>
        {error && <p className="form-error">{error}</p>}
        <div className="chip-row">
          <button
            type="button"
            className="chip chip--accent"
            disabled={draft.days.length === 0 || !draft.start || !draft.end || draft.start === draft.end}
            onClick={save}
          >
            Save
          </button>
          <button type="button" className="button-quiet" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!info?.pattern) {
    return (
      <button type="button" className="chip chip--wide" onClick={() => setEditing(true)}>
        Make time for this
      </button>
    );
  }

  return (
    <div className="goal-time">
      <p className="sheet__label">Time set aside</p>
      <p className="goal-time__when">{current ? describeWeekly(current) : info.pattern.name}</p>
      {info.next && (
        <p className="goal-time__next">
          Next: {info.next.start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, {formatTimeOf(info.next.start)}
        </p>
      )}
      <div className="chip-row">
        {current && (
          <button
            type="button"
            className="chip chip--small"
            onClick={() => {
              setDraft(current);
              setEditing(true);
            }}
          >
            Change times
          </button>
        )}
        <button type="button" className="button-quiet" onClick={stop}>
          Stop setting time aside
        </button>
      </div>
    </div>
  );
}

function Goal({ goal }: { goal: CompassStatement }) {
  const { openItem, offerUndo } = useOverlays();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(goal.note ?? '');
  const [step, setStep] = useState('');
  const [showAll, setShowAll] = useState(false);
  const record = useServiceData(
    subscribeItems,
    async () => goalRecord(goal.id, await lifeService.list(), await lifeService.historyForAll()),
    [goal.id],
  );
  const reached = Boolean(goal.reachedAt);
  const done = record?.done ?? [];

  async function addStep(event: FormEvent) {
    event.preventDefault();
    const title = step.trim();
    if (!title) return;
    setStep('');
    await lifeService.capture(title, 'DO', { goalId: goal.id });
  }

  return (
    <li className="goal">
      <button
        type="button"
        className={`goal__main tag--${goal.color ?? 'none'}${goal.color ? ' goal__main--colored' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="goal__title">{goal.body}</span>
        {goal.note && <span className="goal__note">{goal.note}</span>}
        {reached ? (
          <span className="goal__meta">Reached {dayLabel(goal.reachedAt!).toLowerCase()}</span>
        ) : (
          done[0] && <span className="goal__meta">Last step {dayLabel(done[0].at).toLowerCase()}</span>
        )}
      </button>

      {open && (
        <div className="goal__more">
          <input
            className="field-input"
            aria-label={`Why ${goal.body} matters`}
            placeholder="Why it matters to you, if you like"
            value={note}
            maxLength={280}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => note !== (goal.note ?? '') && compassService.updateGoal(goal.id, { note })}
          />

          <ColorChoice
            label={`Colour for ${goal.body}`}
            value={goal.color}
            onChange={async (color) => {
              await compassService.updateGoal(goal.id, { color: color ?? null });
              // Its time takes the same colour, so the week reads as one.
              const pattern = goal.patternId ? await scheduleService.getPattern(goal.patternId) : null;
              if (pattern) await scheduleService.updatePattern(pattern.id, { ...inputOf(pattern), color: color ?? 'sage' });
            }}
          />

          <GoalTime goal={goal} />

          {!reached && (
            <form className="inline-form" onSubmit={addStep}>
              <input
                className="field-input"
                aria-label={`A step toward ${goal.body}`}
                placeholder="A step toward it"
                value={step}
                onChange={(event) => setStep(event.target.value)}
              />
              <button type="submit" className="button-accent" disabled={!step.trim()}>
                Add
              </button>
            </form>
          )}

          {record && record.open.length > 0 && (
            <div className="goal__list">
              <p className="sheet__label">Next steps</p>
              <ul>
                {record.open.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="goal__step" onClick={() => openItem(item.id)}>
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {done.length > 0 && (
            <div className="goal__list">
              <p className="sheet__label">Steps taken</p>
              <ul>
                {(showAll ? done : done.slice(0, DONE_SHOWN)).map(({ item, at }) => (
                  <li key={item.id} className="goal__done">
                    <span>{item.title}</span>
                    <span className="goal__when">{dayLabel(at)}</span>
                  </li>
                ))}
              </ul>
              {done.length > DONE_SHOWN && (
                <button type="button" className="text-link" onClick={() => setShowAll(!showAll)}>
                  {showAll ? 'Show fewer' : 'Show all'}
                </button>
              )}
            </div>
          )}

          <div className="chip-row">
            <button
              type="button"
              className="chip chip--small"
              onClick={async () => {
                const change = await compassService.updateGoal(goal.id, { reachedAt: reached ? null : new Date().toISOString() });
                offerUndo(reached ? `Back to working toward: ${goal.body}` : `Reached: ${goal.body}`, change.undo);
              }}
            >
              {reached ? 'Still working toward it' : 'I’ve reached this'}
            </button>
            <button
              type="button"
              className="button-quiet"
              onClick={async () => {
                // Its set-aside time goes with it; undo brings both back.
                const pattern = goal.patternId ? await scheduleService.getPattern(goal.patternId) : null;
                const savedTime = pattern ? inputOf(pattern) : undefined;
                if (pattern) await scheduleService.removePattern(pattern.id);
                const removal = await compassService.removeStatement(goal.id);
                offerUndo(`Set down: ${goal.body}`, async () => {
                  await removal.undo();
                  if (savedTime) {
                    const restored = await scheduleService.createPattern(savedTime);
                    await compassService.updateGoal(goal.id, { patternId: restored.id });
                  }
                });
              }}
            >
              Set it down
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * What the person is working toward, in their words. Steps taken are kept
 * as a record to look back on. Nothing is measured: no percentages,
 * targets, or dates to meet, and setting one down is always fine.
 */
export default function GoalsSection({ goals }: { goals: CompassStatement[] }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const current = goals.filter((goal) => !goal.reachedAt);
  const reached = goals.filter((goal) => goal.reachedAt).sort((a, b) => b.reachedAt!.localeCompare(a.reachedAt!));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setError('');
    try {
      await compassService.addGoal(text);
      setText('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add that.');
    }
  }

  return (
    <section className="stack-tight" aria-label="Working toward">
      <div>
        <h2 className="section-label">Working toward</h2>
        <p className="section-description">Something you are building, in your words. The steps you take are kept here; nothing is measured.</p>
      </div>
      {current.length > 0 && (
        <ul className="goals">
          {current.map((goal) => (
            <Goal key={goal.id} goal={goal} />
          ))}
        </ul>
      )}
      {current.length < MAX_GOALS && (
        <form className="inline-form" onSubmit={submit}>
          <input
            className="field-input"
            aria-label="Something you are working toward"
            placeholder="e.g. Learn to cook a few meals"
            value={text}
            maxLength={280}
            onChange={(event) => setText(event.target.value)}
          />
          <button type="submit" className="button-accent" disabled={!text.trim()}>
            Add
          </button>
        </form>
      )}
      {error && <p className="form-error">{error}</p>}
      {reached.length > 0 && (
        <details className="closed-list">
          <summary>Reached</summary>
          <ul className="goals">
            {reached.map((goal) => (
              <Goal key={goal.id} goal={goal} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
