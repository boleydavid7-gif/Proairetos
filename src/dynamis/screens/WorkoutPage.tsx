import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import type { DynamisNav } from '../app/App';
import { isSetup, plan, workouts } from '../app/state';
import { sessionName, setsText, type ExerciseLog, type Workout } from '../core/plan';

const number = (text: string) => {
  const value = Number(text.replace(',', '.'));
  return text.trim() && Number.isFinite(value) && value >= 0 ? value : undefined;
};

export default function WorkoutPage({ nav, id }: { nav: DynamisNav; id: string }) {
  const workout = workouts.use().find((each) => each.id === id);
  const setup = plan.use();
  const unit = isSetup(setup) ? setup.unit : 'kg';
  const [draft, setDraft] = useState<ExerciseLog[]>();
  if (!workout) {
    return (
      <div className="page dynamis-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Not found on this device.</p>
      </div>
    );
  }

  const when = new Date(`${workout.date}T12:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const change = (exercise: number, set: number, patch: { weight?: number | null; reps?: number }) =>
    setDraft((current) =>
      (current ?? workout.exercises).map((log, at) =>
        at !== exercise ? log : { ...log, sets: log.sets.map((each, index) => (index !== set ? each : { ...each, ...(patch.reps !== undefined ? { reps: patch.reps } : {}), ...(patch.weight !== undefined && patch.weight !== null ? { weight: patch.weight } : {}) })) },
      ),
    );
  const save = () => {
    if (!draft) return;
    const before: Workout = workout;
    workouts.put({ ...workout, exercises: draft });
    offerUndo('Session changed', () => workouts.put(before));
    setDraft(undefined);
  };

  return (
    <div className="page dynamis-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={draft ? () => setDraft(undefined) : nav.back}>{draft ? 'Cancel' : 'Back'}</button>
        <p className="label">{sessionName(isSetup(setup) ? setup : undefined, workout.session)}</p>
        {draft ? <button type="button" className="text-link" onClick={save}>Save</button> : <button type="button" className="text-link" onClick={() => setDraft(workout.exercises)}>Edit</button>}
      </div>
      <h1 className="title">{when}</h1>
      <section className="card">
        <ul className="notes-list">
          {(draft ?? workout.exercises).map((log, exercise) => (
            <li key={log.exercise} className="note-line dynamis-then">
              <span>{log.name}</span>
              {draft ? (
                <div className="dynamis-edit">
                  {log.sets.map((set, index) => (
                    <div key={index} className="input-row">
                      {set.weight !== undefined && (
                        <label className="field">
                          <span className="field__label">{`Set ${index + 1}, ${unit}`}</span>
                          <input className="input" inputMode="decimal" defaultValue={set.weight} onChange={(event) => { const value = number(event.target.value); if (value !== undefined) change(exercise, index, { weight: value }); }} />
                        </label>
                      )}
                      <label className="field">
                        <span className="field__label">{set.weight !== undefined ? 'Reps' : `Set ${index + 1}`}</span>
                        <input className="input" inputMode="numeric" defaultValue={set.reps} onChange={(event) => { const value = number(event.target.value); if (value !== undefined) change(exercise, index, { reps: value }); }} />
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <small className="muted">{setsText(log, unit)}</small>
              )}
            </li>
          ))}
        </ul>
        {(workout.minutes || workout.felt) && <p className="fine">{[workout.minutes ? `${workout.minutes} min` : undefined, workout.felt ? `Felt ${workout.felt}` : undefined].filter(Boolean).join(' · ')}</p>}
        {workout.note && <p className="muted">{workout.note}</p>}
      </section>
      {!draft && (
        <button type="button" className="text-link remove-link" onClick={() => {
          workouts.remove(workout.id);
          offerUndo('Session removed', () => workouts.put(workout));
          nav.back();
        }}>Remove</button>
      )}
    </div>
  );
}
