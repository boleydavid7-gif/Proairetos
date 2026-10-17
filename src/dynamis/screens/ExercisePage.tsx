import { useState } from 'react';
import { LineChart } from '../../app/family/charts';
import type { DynamisNav } from '../app/App';
import ExerciseFigure from '../app/ExerciseFigure';
import { isSetup, plan, savePlan, workouts } from '../app/state';
import { BARBELL, BARS, exerciseHistory, exerciseRecords, platesFor, platesText } from '../core/history';
import { exerciseName, setsText, type Unit } from '../core/plan';
import { EXERCISES, LADDERS } from '../core/library';

const dayText = (date: string) => new Date(`${date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** Plates for a total on the person's bar. */
export function PlateCalculator({ start, unit }: { start?: number; unit: Unit }) {
  const setup = plan.use();
  const bar = setup.bar ?? BARS[unit][0];
  const [total, setTotal] = useState(start !== undefined ? String(start) : '');
  const value = Number(total.replace(',', '.'));
  const plates = total && value > 0 ? platesFor(value, bar, unit) : undefined;
  return (
    <section className="card dynamis-plates">
      <h2 className="card__title card__title--small">Plates</h2>
      <div className="dynamis-plates__inputs">
        <label className="field"><span className="label">Total ({unit})</span><input className="input" inputMode="decimal" value={total} placeholder="–" onChange={(event) => setTotal(event.target.value.replace(/[^\d.,]/g, '').slice(0, 6))} /></label>
        <label className="field"><span className="label">Bar</span>
          <select className="input" value={bar} onChange={(event) => isSetup(setup) && savePlan({ ...setup, bar: Number(event.target.value) })}>
            {BARS[unit].map((each) => <option key={each} value={each}>{each} {unit}</option>)}
          </select>
        </label>
      </div>
      {plates && (
        value < bar ? <p className="muted">Lighter than the bar.</p> : (
          <>
            <p className="dynamis-plates__answer">{platesText(plates.side)}</p>
            {plates.left > 0 && <p className="fine">{plates.left} {unit} each side short of {value} {unit} with the usual plates.</p>}
          </>
        )
      )}
    </section>
  );
}

/** One exercise across the log: records, a line over time, every session's sets. */
export default function ExercisePage({ nav, id }: { nav: DynamisNav; id: string }) {
  const all = workouts.use();
  const setup = plan.use();
  const unit: Unit = isSetup(setup) ? setup.unit : 'kg';
  const history = exerciseHistory(all, id);
  const records = exerciseRecords(history);
  const measure = EXERCISES[id]?.measure ?? LADDERS[id]?.[history[0]?.log.step ?? 0]?.measure ?? 'reps';
  const name = history[0]?.log.name ?? exerciseName(id);
  const weighted = history.some(({ log }) => log.sets.some((set) => set.weight !== undefined));
  const points = [...history].reverse().map(({ date, log }) => {
    const weights = log.sets.map((set) => set.weight).filter((value): value is number => value !== undefined);
    return { at: new Date(`${date}T12:00`).getTime(), values: [weighted && weights.length ? Math.max(...weights) : Math.max(...log.sets.map((set) => set.reps))] };
  });
  const latestWeight = history[0]?.log.sets.map((set) => set.weight).find((value) => value !== undefined);

  return (
    <div className="page dynamis-page">
      <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
      <div className="dynamis-exercise__top">
        <ExerciseFigure id={id} size={92} />
        <div className="dynamis-exercise__head">
          <h1 className="title">{name}</h1>
          {history.length > 0 && <span className="muted">{history.length === 1 ? 'Once' : `${history.length} sessions`} since {dayText(history[history.length - 1].date)}</span>}
        </div>
      </div>

      {history.length === 0 ? <p className="muted">Not in the log yet.</p> : (
        <section className="card">
          <ul className="notes-list">
            {records.heaviest && <li className="note-line dynamis-then"><span>Heaviest</span><small className="muted">{records.heaviest.weight} {unit} × {records.heaviest.reps} · {dayText(records.heaviest.date)}</small></li>}
            {records.mostReps && <li className="note-line dynamis-then"><span>{measure === 'seconds' ? 'Longest' : 'Most reps'}</span><small className="muted">{measure === 'seconds' ? `${records.mostReps.reps} s` : records.mostReps.weight !== undefined ? `${records.mostReps.reps} × ${records.mostReps.weight} ${unit}` : `${records.mostReps.reps}`} · {dayText(records.mostReps.date)}</small></li>}
          </ul>
          <LineChart title={weighted ? `Heaviest set, ${unit}` : measure === 'seconds' ? 'Longest hold, s' : 'Most reps in a set'} unit={weighted ? unit : measure === 'seconds' ? 's' : ''} series={[{ name }]} points={points} />
        </section>
      )}

      {BARBELL.has(id) && <PlateCalculator start={latestWeight} unit={unit} />}

      {history.length > 0 && (
        <section className="card">
          <h2 className="card__title card__title--small">Every session</h2>
          <ul className="chore-list">
            {history.map(({ date, workoutId, log }) => (
              <li key={workoutId} className="chore">
                <button type="button" className="chore__open" onClick={() => nav.go({ name: 'workout', id: workoutId })}>
                  <span>{setsText(log, unit, measure)}</span>
                </button>
                <span className="chore__when">{dayText(date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
