import { useState } from 'react';
import type { Nav } from '../app/App';
import { BackLink, useUndo } from '../app/ui';
import SessionBar, { SessionKey } from '../app/SessionBar';
import { newId } from '../app/state';
import { putOwnSession, removeOwnSession, saveOwnSessions, useOwnSessions } from '../app/own';
import { efforts, type Effort } from '../core/effort';
import { ENDS, REST_EFFORTS, STRETCHES, WORK_EFFORTS, newSession, ownWorkout, type OwnSession } from '../core/own';
import { lengthLabel, sessionLines, totalMinutes } from '../core/workouts';
import { Sym } from '../../lamplight/icons';

function Choices<T extends string | number>({ label, value, options, name, onPick }: { label: string; value: T | undefined; options: readonly T[]; name: (option: T) => string; onPick: (option: T) => void }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="chip-row" role="group" aria-label={label}>
        {options.map((option) => (
          <button key={String(option)} type="button" className="chip" aria-pressed={value === option} onClick={() => onPick(option)}>
            {name(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Builder({ start, onDone, onCancel }: { start: OwnSession; onDone: (session: OwnSession) => void; onCancel: () => void }) {
  const [session, setSession] = useState(start);
  const change = (next: Partial<OwnSession>) => setSession({ ...session, ...next });
  const workout = ownWorkout(session);
  const effortName = (effort: Effort) => efforts[effort].name;
  return (
    <div className="stack own-builder">
      <label className="field">
        <span className="label">Name (optional)</span>
        <input className="input" value={session.title} placeholder={workout.title} maxLength={60} onChange={(event) => change({ title: event.target.value })} />
      </label>
      <Choices label="Warm up" value={session.warmUp} options={ENDS} name={(minutes) => (minutes ? `${minutes} min` : 'None')} onPick={(warmUp) => change({ warmUp })} />
      <div className="field">
        <span className="label">Repeats</span>
        <div className="own-stepper">
          <button type="button" className="chip" aria-label="One fewer" disabled={session.repeat <= 1} onClick={() => change({ repeat: session.repeat - 1 })}>
            <Sym name="minus" />
          </button>
          <span className="own-stepper__value">{session.repeat}</span>
          <button type="button" className="chip" aria-label="One more" disabled={session.repeat >= 30} onClick={() => change({ repeat: session.repeat + 1 })}>
            <Sym name="plus" />
          </button>
        </div>
      </div>
      <Choices label="Each one" value={session.work.effort} options={WORK_EFFORTS} name={effortName} onPick={(effort) => change({ work: { ...session.work, effort } })} />
      <Choices label="For" value={session.work.minutes} options={STRETCHES} name={lengthLabel} onPick={(minutes) => change({ work: { ...session.work, minutes } })} />
      <Choices
        label="Then"
        value={session.rest?.effort ?? ('none' as Effort)}
        options={[...REST_EFFORTS, 'none' as Effort]}
        name={(effort) => (effort === ('none' as Effort) ? 'Straight on' : effortName(effort))}
        onPick={(effort) => change({ rest: effort === ('none' as Effort) ? undefined : { effort, minutes: session.rest?.minutes ?? 2 } })}
      />
      {session.rest && <Choices label="For" value={session.rest.minutes} options={STRETCHES} name={lengthLabel} onPick={(minutes) => change({ rest: { ...session.rest!, minutes } })} />}
      <Choices label="Cool down" value={session.coolDown} options={ENDS} name={(minutes) => (minutes ? `${minutes} min` : 'None')} onPick={(coolDown) => change({ coolDown })} />
      <div className="card own-preview">
        <p className="own-preview__length">{lengthLabel(totalMinutes(workout.parts))}</p>
        <SessionBar parts={workout.parts} large />
      </div>
      <button type="button" className="button-main" onClick={() => onDone(session)}>
        Save
      </button>
      <button type="button" className="button-quiet" onClick={onCancel}>
        Cancel
      </button>
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
          {sessionLines(workout.parts).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
        <div className="session-start">
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'guide', id: workout.id })}>
            Start
          </button>
          <div className="link-row">
            <button type="button" className="text-link" onClick={() => nav.go({ name: 'entry', workoutId: workout.id })}>
              Log it
            </button>
            <button type="button" className="text-link" onClick={() => setEditing(true)}>
              Change
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                const before = removeOwnSession(found.id);
                nav.back();
                offer('Session removed', () => saveOwnSessions(before));
              }}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
