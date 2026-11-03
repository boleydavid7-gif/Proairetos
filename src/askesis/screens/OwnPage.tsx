import { useState } from 'react';
import type { Nav } from '../app/App';
import { BackLink, useUndo } from '../app/ui';
import SessionBar, { SessionKey } from '../app/SessionBar';
import { newId } from '../app/state';
import { putOwnSession, removeOwnSession, saveOwnSessions, useOwnSessions } from '../app/own';
import { efforts, type Effort } from '../core/effort';
import { STRETCHES, newSession, ownWorkout, type OwnSession } from '../core/own';
import { flatten, isSet, lengthLabel, sessionLines, totalMinutes, type Part, type Step } from '../core/workouts';
import { Sym } from '../../lamplight/icons';

const effortOptions = Object.keys(efforts) as Effort[];
const defaultStep = (): Step => ({ effort: 'easy', minutes: 5 });
const defaultInterval = (): Part => ({
  repeat: 4,
  steps: [
    { effort: 'hard', minutes: 1 },
    { effort: 'recovery', minutes: 2 },
  ],
});

function StepEditor({
  step,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  first,
  last,
  showTools = true,
}: {
  step: Step;
  onChange: (step: Step) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  first: boolean;
  last: boolean;
  showTools?: boolean;
}) {
  return (
    <div className="own-step">
      <div className="own-step__fields">
        <label className="own-step__field">
          <span className="sr-only">Effort</span>
          <select className="input" value={step.effort} onChange={(event) => onChange({ ...step, effort: event.target.value as Effort })}>
            {effortOptions.map((effort) => <option key={effort} value={effort}>{efforts[effort].name}</option>)}
          </select>
        </label>
        <label className="own-step__field own-step__field--duration">
          <span className="sr-only">Duration</span>
          <select className="input" value={step.minutes} onChange={(event) => onChange({ ...step, minutes: Number(event.target.value) })}>
            {STRETCHES.map((minutes) => <option key={minutes} value={minutes}>{lengthLabel(minutes)}</option>)}
          </select>
        </label>
      </div>
      {showTools && <div className="own-step__tools">
        <button type="button" className="icon-button" aria-label="Move step up" disabled={first} onClick={onMoveUp}><Sym name="arrowUp" /></button>
        <button type="button" className="icon-button" aria-label="Move step down" disabled={last} onClick={onMoveDown}><Sym name="arrowDown" /></button>
        <button type="button" className="text-link own-step__remove" onClick={onRemove}>Remove</button>
      </div>}
      <label className="own-step__note">
        <span className="sr-only">Optional step note</span>
        <input className="input" value={step.note ?? ''} maxLength={60} placeholder="Add a note (optional)" onChange={(event) => onChange({ ...step, note: event.target.value || undefined })} />
      </label>
    </div>
  );
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function Builder({ start, fresh = false, onDone, onCancel }: { start: OwnSession; fresh?: boolean; onDone: (session: OwnSession) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(start.title);
  const [parts, setParts] = useState<Part[]>(() => fresh ? [{ effort: 'easy', minutes: 20 }] : start.parts?.length ? start.parts : ownWorkout(start).parts);
  const session = { ...start, title, parts };
  const workout = ownWorkout(session);
  const valid = parts.length > 0 && parts.every((part) =>
    isSet(part)
      ? Number.isInteger(part.repeat) && part.repeat >= 1 && part.repeat <= 30 && part.steps.length > 0 && part.steps.every((step) => step.minutes > 0)
      : part.minutes > 0,
  );

  const updateStep = (partIndex: number, stepIndex: number, next: Step) => {
    setParts((before) => before.map((part, index) => {
      if (index !== partIndex) return part;
      if (!isSet(part)) return next;
      return { ...part, steps: part.steps.map((step, at) => at === stepIndex ? next : step) };
    }));
  };

  return (
    <div className="stack own-builder">
      <label className="field">
        <span className="label">Session name</span>
        <input className="input" value={title} maxLength={60} placeholder="Give this session a name" onChange={(event) => setTitle(event.target.value)} />
      </label>

      <section className="own-builder__sequence" aria-label="Workout steps">
        <div className="own-builder__heading">
          <div>
            <h2 className="card__title card__title--small">Your session</h2>
            <p className="muted">Put each effort in the order you want to do it.</p>
          </div>
          <span className="card__eyebrow">{parts.length} {parts.length === 1 ? 'part' : 'parts'}</span>
        </div>

        {parts.map((part, index) => isSet(part) ? (
          <section className="own-part own-part--set" key={index}>
            <div className="own-part__head">
              <div>
                <span className="card__eyebrow">Interval set</span>
                <strong>{part.repeat} repeats</strong>
              </div>
              <div className="own-part__actions">
                <button type="button" className="icon-button" aria-label="Move interval set up" disabled={index === 0} onClick={() => setParts((before) => move(before, index, index - 1))}><Sym name="arrowUp" /></button>
                <button type="button" className="icon-button" aria-label="Move interval set down" disabled={index === parts.length - 1} onClick={() => setParts((before) => move(before, index, index + 1))}><Sym name="arrowDown" /></button>
                <button type="button" className="text-link" onClick={() => setParts((before) => before.filter((_, at) => at !== index))}>Remove set</button>
              </div>
            </div>
            <div className="own-stepper">
              <button type="button" className="chip" aria-label="One fewer repeat" disabled={part.repeat <= 1} onClick={() => setParts((before) => before.map((each, at) => at === index && isSet(each) ? { ...each, repeat: each.repeat - 1 } : each))}><Sym name="minus" /></button>
              <span className="own-stepper__value">{part.repeat}</span>
              <button type="button" className="chip" aria-label="One more repeat" disabled={part.repeat >= 30} onClick={() => setParts((before) => before.map((each, at) => at === index && isSet(each) ? { ...each, repeat: each.repeat + 1 } : each))}><Sym name="plus" /></button>
            </div>
            <div className="own-part__steps">
              {part.steps.map((step, stepIndex) => (
                <StepEditor
                  key={stepIndex}
                  step={step}
                  first={stepIndex === 0}
                  last={stepIndex === part.steps.length - 1}
                  onChange={(next) => updateStep(index, stepIndex, next)}
                  onRemove={() => setParts((before) => before.map((each, at) => at === index && isSet(each) ? { ...each, steps: each.steps.filter((_, inner) => inner !== stepIndex) } : each))}
                  onMoveUp={() => setParts((before) => before.map((each, at) => at === index && isSet(each) ? { ...each, steps: move(each.steps, stepIndex, stepIndex - 1) } : each))}
                  onMoveDown={() => setParts((before) => before.map((each, at) => at === index && isSet(each) ? { ...each, steps: move(each.steps, stepIndex, stepIndex + 1) } : each))}
                />
              ))}
              <button type="button" className="button-quiet own-part__add" onClick={() => setParts((before) => before.map((each, at) => at === index && isSet(each) ? { ...each, steps: [...each.steps, defaultStep()] } : each))}>Add a step to this set</button>
            </div>
          </section>
        ) : (
          <section className="own-part" key={index}>
            <div className="own-part__head">
              <span className="card__eyebrow">Step {index + 1}</span>
              <div className="own-part__actions">
                <button type="button" className="icon-button" aria-label="Move step up" disabled={index === 0} onClick={() => setParts((before) => move(before, index, index - 1))}><Sym name="arrowUp" /></button>
                <button type="button" className="icon-button" aria-label="Move step down" disabled={index === parts.length - 1} onClick={() => setParts((before) => move(before, index, index + 1))}><Sym name="arrowDown" /></button>
                <button type="button" className="text-link" onClick={() => setParts((before) => before.filter((_, at) => at !== index))}>Remove</button>
              </div>
            </div>
            <StepEditor
              step={part}
              first
              last
              showTools={false}
              onChange={(next) => updateStep(index, 0, next)}
              onRemove={() => setParts((before) => before.filter((_, at) => at !== index))}
              onMoveUp={() => setParts((before) => move(before, index, index - 1))}
              onMoveDown={() => setParts((before) => move(before, index, index + 1))}
            />
          </section>
        ))}
      </section>

      <div className="own-builder__add">
        <button type="button" className="button-quiet" onClick={() => setParts((before) => [...before, defaultStep()])}>Add a step</button>
        <button type="button" className="button-quiet" onClick={() => setParts((before) => [...before, defaultInterval()])}>Add an interval set</button>
      </div>

      <div className="card own-preview">
        <div className="own-preview__head">
          <div>
            <span className="card__eyebrow">Session preview</span>
            <p className="own-preview__length">{lengthLabel(totalMinutes(workout.parts))}</p>
          </div>
          <span className="card__eyebrow">{flatten(workout.parts).length} steps in sequence</span>
        </div>
        <SessionBar parts={workout.parts} large />
        <ol className="session-lines own-preview__lines">
          {sessionLines(workout.parts).map((line, index) => <li key={index}>{line}</li>)}
        </ol>
      </div>

      <button type="button" className="button-main" disabled={!valid} onClick={() => onDone(session)}>Save session</button>
      <button type="button" className="button-quiet" onClick={onCancel}>Cancel</button>
    </div>
  );
}

/** One of the runner's own sessions: start it, log it, change it, remove it. `id` absent: a new one. */
export default function OwnPage({ nav, id }: { nav: Nav; id?: string }) {
  const sessions = useOwnSessions();
  const offer = useUndo();
  const found = id ? sessions.find((each) => each.id === id) : undefined;
  const [editing, setEditing] = useState(!id);

  if (editing || !found) {
    if (id && !found)
      return (
        <div className="page">
          <BackLink label="Back" onBack={nav.back} />
          <p className="muted">This session was removed.</p>
        </div>
      );
    return (
      <div className="page">
        <BackLink label="Cancel" onBack={found ? () => setEditing(false) : nav.back} />
        <h1 className="title">{found ? 'Change session' : 'New session'}</h1>
        <Builder
          start={found ?? newSession(`own-${newId()}`)}
          fresh={!found}
          onCancel={found ? () => setEditing(false) : nav.back}
          onDone={(session) => {
            putOwnSession(session);
            if (found) setEditing(false);
            else nav.swap({ name: 'own', id: session.id });
          }}
        />
      </div>
    );
  }

  const workout = ownWorkout(found);
  return (
    <div className="workout">
      <div className="page">
        <BackLink label="Back" onBack={nav.back} />
        <header className="session-head session-head--hard">
          <p className="card__eyebrow">Your session</p>
          <h1 className="title">{workout.title}</h1>
          <p className="session-head__length">{lengthLabel(totalMinutes(workout.parts))}</p>
        </header>
        <SessionBar parts={workout.parts} large />
        <SessionKey parts={workout.parts} />
        <ol className="session-lines">
          {sessionLines(workout.parts).map((line, i) => <li key={i}>{line}</li>)}
        </ol>
        <div className="session-start">
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'guide', id: workout.id })}>Start</button>
          <div className="link-row">
            <button type="button" className="text-link" onClick={() => nav.go({ name: 'entry', workoutId: workout.id })}>Log it</button>
            <button type="button" className="text-link" onClick={() => setEditing(true)}>Change</button>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                const before = removeOwnSession(found.id);
                nav.back();
                offer('Session removed', () => saveOwnSessions(before));
              }}
            >Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
}
