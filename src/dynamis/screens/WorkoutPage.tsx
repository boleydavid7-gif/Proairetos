import { offerUndo } from '../../app/family/shell';
import type { DynamisNav } from '../app/App';
import { isSetup, plan, workouts } from '../app/state';
import { setsText } from '../core/plan';

export default function WorkoutPage({ nav, id }: { nav: DynamisNav; id: string }) {
  const workout = workouts.use().find((each) => each.id === id);
  const setup = plan.use();
  const unit = isSetup(setup) ? setup.unit : 'kg';
  if (!workout) {
    return (
      <div className="page dynamis-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Not found on this device.</p>
      </div>
    );
  }
  return (
    <div className="page dynamis-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">{new Date(`${workout.date}T12:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <span />
      </div>
      <section className="card">
        <ul className="notes-list">
          {workout.exercises.map((log) => (
            <li key={log.exercise} className="note-line dynamis-then">
              <span>{log.name}</span>
              <small className="muted">{setsText(log, unit)}</small>
            </li>
          ))}
        </ul>
        {(workout.minutes || workout.felt) && <p className="fine">{[workout.minutes ? `${workout.minutes} min` : undefined, workout.felt ? `Felt ${workout.felt}` : undefined].filter(Boolean).join(' · ')}</p>}
      </section>
      <button type="button" className="text-link remove-link" onClick={() => {
        workouts.remove(workout.id);
        offerUndo('Session removed', () => workouts.put(workout));
        nav.back();
      }}>Remove</button>
    </div>
  );
}
