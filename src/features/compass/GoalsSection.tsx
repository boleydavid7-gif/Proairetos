import { useState, type FormEvent } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, lifeService } from '../../app/services';
import { goalRecord } from '../../core/compass/goals';
import { MAX_GOALS, type CompassStatement } from '../../core/compass/types';
import { dayLabel } from '../reflect/format';

const DONE_SHOWN = 5;

function subscribeItems(listener: () => void) {
  return lifeService.subscribe(listener);
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
      <button type="button" className="goal__main" aria-expanded={open} onClick={() => setOpen(!open)}>
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
                const removal = await compassService.removeStatement(goal.id);
                offerUndo(`Set down: ${goal.body}`, removal.undo);
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
