import { useState } from 'react';
import { reflectionService } from '../../app/services';
import { offerUndo } from '../../app/family/shell';
import type { DynamisNav } from '../app/App';
import { workouts } from '../app/state';
import { DailyLine } from '../../app/family/DailyLine';

/** After a session: relief, not praise. The facts, a line to keep in Reflect if wanted, and mobility to follow. */
export default function AfterPage({ nav, id }: { nav: DynamisNav; id: string }) {
  const workout = workouts.use().find((each) => each.id === id);
  const [line, setLine] = useState('');
  const [kept, setKept] = useState(false);
  const sets = workout?.exercises.reduce((sum, log) => sum + log.sets.length, 0) ?? 0;

  const keep = async () => {
    if (!line.trim()) return;
    const reflection = await reflectionService.write({ body: `Strength training: ${line.trim()}`, kind: 'FREE', promptKey: 'after-strength' });
    setKept(true);
    offerUndo('Kept in Reflect', () => void reflectionService.remove(reflection.id));
  };

  return (
    <div className="page dynamis-page">
      <div className="page-top"><h1 className="title">That&rsquo;s the session</h1></div>
      {workout && <p className="muted">{[workout.exercises.length === 1 ? '1 exercise' : `${workout.exercises.length} exercises`, sets === 1 ? '1 set' : `${sets} sets`, workout.minutes ? `${workout.minutes} min` : undefined].filter(Boolean).join(' · ')}</p>}

      <section className="card">
        <h2 className="card__title card__title--small">A line to keep in Reflect (optional)</h2>
        {kept ? (
          <p className="muted">Kept.</p>
        ) : (
          <form className="add-line" onSubmit={(event) => { event.preventDefault(); void keep(); }}>
            <input className="input" aria-label="A line to keep" value={line} onChange={(event) => setLine(event.target.value)} />
            <button type="submit" className="button-quiet" disabled={!line.trim()}>Save</button>
          </form>
        )}
      </section>

      <div className="button-row">
        <button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'guide', routine: 'after' })}>Mobility after training</button>
        <button type="button" className="button-main" onClick={() => nav.swap({ name: 'today' })}>Done</button>
      </div>
      <DailyLine app="dynamis" />
    </div>
  );
}
