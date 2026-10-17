import { Empty } from '../../app/family/shell';
import { HistoryIcon } from '../../app/family/icons';
import { useState } from 'react';
import { LineChart } from '../../app/family/charts';
import type { DynamisNav } from '../app/App';
import { isSetup, mobility, plan, workouts } from '../app/state';
import { ROUTINES } from '../core/mobility';
import { exerciseFacts, setsText, type Unit } from '../core/plan';

const dayText = (date: string) => new Date(`${date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export default function LogPage({ nav }: { nav: DynamisNav }) {
  const all = workouts.use();
  const stretched = mobility.use();
  const setup = plan.use();
  const unit: Unit = isSetup(setup) ? setup.unit : 'kg';
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const exercises = [...new Set(all.flatMap((workout) => workout.exercises.map((each) => each.exercise)))];
  // Over time: the heaviest set of each session, or the most reps for one done without weight.
  const tracked = exercises.filter((id) => all.filter((workout) => workout.exercises.some((each) => each.exercise === id && each.sets.length)).length >= 2);
  const [chosen, setChosen] = useState<string>();
  const shown = chosen && tracked.includes(chosen) ? chosen : tracked[0];
  const series = shown
    ? all
        .flatMap((workout) => workout.exercises.filter((each) => each.exercise === shown && each.sets.length).map((log) => ({ date: workout.date, log })))
        .map(({ date, log }) => {
          const weights = log.sets.map((set) => set.weight).filter((value): value is number => value !== undefined);
          return { at: new Date(`${date}T12:00`).getTime(), values: [weights.length ? Math.max(...weights) : Math.max(...log.sets.map((set) => set.reps))], weighted: weights.length > 0, name: log.name };
        })
    : [];

  return (
    <div className="page dynamis-page">
      <div className="page-top"><h1 className="title">Log</h1></div>
      {sorted.length === 0 && stretched.length === 0 && <Empty icon={<HistoryIcon size={28} />} title="No sessions yet" line="Saved sessions, with every set." />}
      {sorted.length > 0 && (
        <ul className="chore-list">
          {sorted.slice(0, 40).map((workout) => (
            <li key={workout.id} className="chore">
              <button type="button" className="chore__open" onClick={() => nav.go({ name: 'workout', id: workout.id })}>
                <span>{workout.exercises.length ? workout.exercises.map((each) => each.name).join(', ') : 'Session'}</span>
                <small>{[workout.minutes ? `${workout.minutes} min` : undefined, workout.felt ? workout.felt[0].toUpperCase() + workout.felt.slice(1) : undefined].filter(Boolean).join(' · ')}</small>
              </button>
              <span className="chore__when">{dayText(workout.date)}</span>
            </li>
          ))}
        </ul>
      )}

      {tracked.length > 0 && shown && (
        <section className="card">
          <h2 className="card__title card__title--small">Over time</h2>
          {tracked.length > 1 && (
            <div className="chip-row" role="group" aria-label="Exercise">
              {tracked.map((id) => <button key={id} type="button" className="chip" aria-pressed={shown === id} onClick={() => setChosen(id)}>{exerciseFacts(all, id).latest?.log.name ?? id}</button>)}
            </div>
          )}
          <LineChart
            title={series[0]?.weighted ? `Heaviest set, ${unit}` : 'Most reps in a set'}
            unit={series[0]?.weighted ? unit : ''}
            series={[{ name: series[0]?.name ?? '' }]}
            points={series.map(({ at, values }) => ({ at, values }))}
          />
        </section>
      )}

      {exercises.length > 0 && (
        <section className="card">
          <h2 className="card__title card__title--small">Then and now</h2>
          <ul className="notes-list">
            {exercises.map((id) => {
              const facts = exerciseFacts(all, id);
              if (!facts.first || !facts.latest) return null;
              return (
                <li key={id} className="note-line dynamis-then">
                  <button type="button" className="dynamis-then__open" onClick={() => nav.go({ name: 'exercise', id })}>
                    <span>{facts.latest.log.name}</span>
                    <small className="muted">{dayText(facts.first.date)}: {setsText(facts.first.log, unit)}</small>
                    {facts.times > 1 && <small className="muted">{dayText(facts.latest.date)}: {setsText(facts.latest.log, unit)}</small>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {stretched.length > 0 && (
        <section className="card">
          <h2 className="card__title card__title--small">Mobility</h2>
          <ul className="notes-list">
            {[...stretched].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 14).map((log) => (
              <li key={log.id} className="note-line">
                <span>{ROUTINES.find((routine) => routine.id === log.routine)?.name ?? 'Mobility'}</span>
                <span className="muted">{dayText(log.date)} · {log.minutes} min</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
