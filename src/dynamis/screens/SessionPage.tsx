import { useEffect, useMemo, useRef, useState } from 'react';
import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon } from '../../app/family/icons';
import { cancelBell, scheduleBell } from '../../praxis/bell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { DynamisNav } from '../app/App';
import { draft, isSetup, newId, plan, savePlan, workouts, type Draft, type DraftSet } from '../app/state';
import { alternatives } from '../core/library';
import { awayDays, lighterWeight, nextSession, sessionsFor, setsText, targetsFor, type Felt, type Target, type Workout } from '../core/plan';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`;

function freshSets(target: Target, lighter: boolean, unit: 'kg' | 'lb'): DraftSet[] {
  return Array.from({ length: target.sets }, (_, index) => {
    const before = target.last?.sets[index] ?? target.last?.sets[target.last.sets.length - 1];
    const weight = target.weight !== undefined && target.loaded ? (lighter ? lighterWeight(target.weight, target.exercise, unit) : target.weight) : undefined;
    return { weight, reps: before?.reps ?? target.range[0] };
  });
}

export default function SessionPage({ nav }: { nav: DynamisNav }) {
  const setup = plan.use();
  const done = workouts.use();
  const current = draft.use().current;
  const [restUntil, setRestUntil] = useState<number>();
  const [now, setNow] = useState(Date.now());
  const [finishing, setFinishing] = useState(false);
  const [felt, setFelt] = useState<Felt>();
  // Once finished or put aside, leaving the page never starts another session.
  const leaving = useRef(false);

  useEffect(() => {
    if (!restUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [restUntil]);

  const ready = isSetup(setup);
  const session = ready ? (current ? sessionsFor(setup).find((each) => each.key === current.session) : undefined) ?? nextSession(setup, done) : undefined;
  const steps = current?.steps ?? {};
  const targets = useMemo(
    () => (ready && session ? targetsFor({ ...setup, steps: { ...setup.steps, ...steps } }, session, done) : []),
    [ready, setup, session?.key, done, JSON.stringify(steps)],
  );
  const away = ready ? awayDays(done, toLocalDate(new Date())) : undefined;

  // A session begins the first time this page opens, and is kept on this phone until finished or put aside.
  useEffect(() => {
    if (!ready || !session || current || leaving.current) return;
    const sets: Draft['sets'] = {};
    for (const target of targets) sets[target.exercise] = freshSets(target, false, setup.unit);
    draft.save({ current: { session: session.key, started: new Date().toISOString(), sets, steps: {} } });
  }, [ready, session?.key, Boolean(current)]);

  if (!ready || !session) {
    return (
      <div className="page dynamis-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Make your plan first.</p>
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'plan' })}>Make your plan</button>
      </div>
    );
  }
  if (!current) return null;

  const change = (next: Draft) => draft.save({ current: next });
  const setsOf = (exercise: string) => current.sets[exercise] ?? [];
  const changeSet = (exercise: string, index: number, patch: Partial<DraftSet>) =>
    change({ ...current, sets: { ...current.sets, [exercise]: setsOf(exercise).map((set, at) => (at === index ? { ...set, ...patch } : set)) } });
  const anyDone = Object.values(current.sets).some((sets) => sets.some((set) => set.done));
  const resting = restUntil ? Math.ceil((restUntil - now) / 1000) : 0;

  const tick = (target: Target, index: number) => {
    const set = setsOf(target.exercise)[index];
    changeSet(target.exercise, index, { done: !set.done });
    if (set.done) return;
    tap();
    // The rest starts with the tap, so the bell may ring with the screen locked.
    setRestUntil(Date.now() + target.rest * 1000);
    setNow(Date.now());
    void scheduleBell(target.rest, 1);
  };

  const finish = () => {
    leaving.current = true;
    const today = toLocalDate(new Date());
    const minutes = Math.max(1, Math.round((Date.now() - new Date(current.started).getTime()) / 60_000));
    const workout: Workout = {
      id: newId(),
      date: today,
      session: current.session,
      exercises: targets
        .map((target) => ({
          exercise: target.exercise,
          step: target.step,
          name: target.name,
          sets: setsOf(target.exercise).filter((set) => set.done).map(({ weight, reps }) => (weight !== undefined && target.loaded ? { weight, reps } : { reps })),
        }))
        .filter((log) => log.sets.length),
      felt,
      minutes: minutes > 240 ? undefined : minutes,
      createdAt: new Date().toISOString(),
    };
    workouts.put(workout);
    const kept = current;
    if (Object.keys(kept.steps).length) savePlan({ ...setup, steps: { ...setup.steps, ...kept.steps } });
    cancelBell();
    draft.save({});
    offerUndo('That’s the session', () => {
      workouts.remove(workout.id);
      savePlan(setup);
      draft.save({ current: kept });
    });
    nav.swap({ name: 'today' });
  };

  return (
    <div className="page dynamis-page dynamis-session">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">{session.name}</p>
        <button type="button" className="text-link" disabled={!anyDone} onClick={() => setFinishing(true)}>Finish</button>
      </div>

      {resting > 0 && (
        <div className="dynamis-rest" role="timer" aria-live="off">
          <span>Rest</span>
          <strong>{clock(resting)}</strong>
          <button type="button" className="text-link" onClick={() => { setRestUntil(undefined); cancelBell(); }}>Skip</button>
        </div>
      )}

      {away && !current.lighter && !anyDone && targets.some((target) => target.weight !== undefined) && (
        <section className="card">
          <span className="card__eyebrow">{`${away} days since the last session`}</span>
          <div className="button-row">
            <button type="button" className="button-quiet" onClick={() => {
              const sets: Draft['sets'] = {};
              for (const target of targets) sets[target.exercise] = freshSets(target, true, setup.unit);
              change({ ...current, sets, lighter: true });
            }}>Start about 10% lighter</button>
          </div>
        </section>
      )}

      {targets.map((target) => {
        const sets = setsOf(target.exercise);
        return (
          <section key={target.exercise} className="card dynamis-exercise">
            <div className="dynamis-exercise__head">
              <h2 className="card__title">{target.name}</h2>
              <span className="muted">{target.range[0]}–{target.range[1]}{target.measure === 'seconds' ? ' s' : ' reps'} · rest {clock(target.rest)}</span>
            </div>
            {target.last && <p className="fine">Last time: {setsText(target.last, setup.unit, target.measure)}</p>}
            {target.ready && (
              <div className="dynamis-ready">
                <span>{'weight' in target.ready ? `Ready for ${target.ready.weight} ${setup.unit}` : 'step' in target.ready ? `Ready for: ${target.ready.name}` : `Ready for ${target.ready.seconds} s`}</span>
                <button type="button" className="button-quiet" onClick={() => {
                  const offer = target.ready!;
                  if ('step' in offer) {
                    change({ ...current, steps: { ...current.steps, [target.exercise]: offer.step } });
                    return;
                  }
                  change({ ...current, sets: { ...current.sets, [target.exercise]: sets.map((set) => (set.done ? set : 'weight' in offer ? { ...set, weight: offer.weight } : { ...set, reps: offer.seconds })) } });
                }}>Use</button>
              </div>
            )}
            <details className="dynamis-how">
              <summary>How</summary>
              <ul>{target.how.map((line) => <li key={line}>{line}</li>)}</ul>
              <p className="fine">Stop each set with one to three {target.measure === 'seconds' ? 'more seconds' : 'reps'} left in you.</p>
              {alternatives(target.pattern, setup.place).length > 1 && !sets.some((set) => set.done) && (
                <label className="field">
                  <span className="field__label">Do instead</span>
                  <select className="input" value={target.exercise} onChange={(event) => {
                    const swapped = event.target.value;
                    const before = setup;
                    savePlan({ ...setup, swaps: { ...setup.swaps, [target.pattern]: swapped } });
                    const { [target.exercise]: _, ...rest } = current.sets;
                    change({ ...current, sets: { ...rest, [swapped]: Array.from({ length: target.sets }, () => ({ reps: target.range[0] })) } });
                    offerUndo('Exercise swapped', () => savePlan(before));
                  }}>
                    {alternatives(target.pattern, setup.place).map((each) => <option key={each.id} value={each.id}>{each.name}</option>)}
                  </select>
                </label>
              )}
            </details>
            <ol className="dynamis-sets">
              {sets.map((set, index) => (
                <li key={index} className={'dynamis-set' + (set.done ? ' is-done' : '')}>
                  <span className="dynamis-set__number">{index + 1}</span>
                  {target.loaded && (
                    <label className="dynamis-set__field">
                      <input className="input" inputMode="decimal" aria-label={`Set ${index + 1} weight`} value={set.weight ?? ''} placeholder="–" onChange={(event) => {
                        const value = event.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                        const weight = value === '' ? undefined : Number(value);
                        // A weight typed in a set fills the sets after it that have none yet.
                        change({ ...current, sets: { ...current.sets, [target.exercise]: sets.map((each, at) => (at === index || (at > index && !each.done && each.weight === undefined && weight !== undefined) ? { ...each, weight } : each)) } });
                      }} />
                      <span>{setup.unit}</span>
                    </label>
                  )}
                  <label className="dynamis-set__field">
                    <input className="input" inputMode="numeric" aria-label={`Set ${index + 1} ${target.measure === 'seconds' ? 'seconds' : 'reps'}`} value={set.reps || ''} onChange={(event) => changeSet(target.exercise, index, { reps: Number(event.target.value.replace(/\D/g, '')) || 0 })} />
                    <span>{target.measure === 'seconds' ? 's' : 'reps'}</span>
                  </label>
                  <button type="button" className="tick" aria-pressed={Boolean(set.done)} aria-label={`Set ${index + 1} done`} onClick={() => tick(target, index)}>
                    <CheckIcon size={20} />
                  </button>
                </li>
              ))}
            </ol>
            <div className="button-row">
              <button type="button" className="text-link" onClick={() => change({ ...current, sets: { ...current.sets, [target.exercise]: [...sets, { ...(sets[sets.length - 1] ?? { reps: target.range[0] }), done: false }] } })}>Add a set</button>
              {sets.length > 1 && !sets[sets.length - 1].done && (
                <button type="button" className="text-link" onClick={() => change({ ...current, sets: { ...current.sets, [target.exercise]: sets.slice(0, -1) } })}>One set fewer</button>
              )}
            </div>
          </section>
        );
      })}

      {finishing ? (
        <section className="card">
          <h2 className="card__title card__title--small">How did it feel? (optional)</h2>
          <div className="chip-row" role="group" aria-label="How it felt">
            {(['easy', 'good', 'hard'] as const).map((each) => <button key={each} type="button" className="chip" aria-pressed={felt === each} onClick={() => setFelt(felt === each ? undefined : each)}>{each[0].toUpperCase() + each.slice(1)}</button>)}
          </div>
          <button type="button" className="button-main" onClick={finish}>Save the session</button>
        </section>
      ) : (
        <button type="button" className="button-main" disabled={!anyDone} onClick={() => setFinishing(true)}>Finish</button>
      )}

      <button type="button" className="text-link remove-link" onClick={() => {
        const kept = current;
        leaving.current = true;
        cancelBell();
        draft.save({});
        offerUndo('Session put aside', () => draft.save({ current: kept }));
        nav.back();
      }}>Put this session aside</button>
    </div>
  );
}
