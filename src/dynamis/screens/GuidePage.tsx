import { useEffect, useRef, useState } from 'react';
import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { cancelBell, scheduleBell } from '../../praxis/bell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { DynamisNav } from '../app/App';
import { mobility, newId } from '../app/state';
import { ROUTINES, routineMinutes, stepsOf } from '../core/mobility';

/** A routine step by step: each hold timed, a bell as it ends (rung from the audio clock, so it keeps time with the screen locked). */
export default function GuidePage({ nav, routine: id }: { nav: DynamisNav; routine: string }) {
  const routine = ROUTINES.find((each) => each.id === id);
  const steps = routine ? stepsOf(routine) : [];
  const [at, setAt] = useState(-1);
  const [endsAt, setEndsAt] = useState<number>();
  const [pausedLeft, setPausedLeft] = useState<number>();
  const [now, setNow] = useState(Date.now());
  const kept = useRef(false);

  useEffect(() => {
    if (!endsAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  useEffect(() => () => cancelBell(), []);

  const begin = (index: number) => {
    if (index >= steps.length) {
      setAt(steps.length);
      setEndsAt(undefined);
      return;
    }
    tap();
    setAt(index);
    setPausedLeft(undefined);
    setEndsAt(Date.now() + steps[index].seconds * 1000);
    setNow(Date.now());
    void scheduleBell(steps[index].seconds, 1);
  };

  // A step moves on by itself when its time is up.
  const left = endsAt ? Math.ceil((endsAt - now) / 1000) : (pausedLeft ?? 0);
  useEffect(() => {
    if (endsAt && left <= 0 && at >= 0 && at < steps.length) begin(at + 1);
  }, [left <= 0, endsAt]);

  useEffect(() => {
    if (!routine || at !== steps.length || kept.current) return;
    kept.current = true;
    const log = { id: newId(), date: toLocalDate(new Date()), routine: routine.id, minutes: routineMinutes(routine), createdAt: new Date().toISOString() };
    mobility.put(log);
    offerUndo('Mobility kept', () => mobility.remove(log.id));
  }, [at]);

  if (!routine) {
    return (
      <div className="page dynamis-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted">Not found.</p>
      </div>
    );
  }

  const step = steps[at];
  return (
    <div className="page dynamis-page dynamis-guide">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={() => { cancelBell(); nav.back(); }}>{at === steps.length ? 'Done' : 'Close'}</button>
        <p className="label">{routine.name}</p>
        <span className="muted">{at >= 0 && at < steps.length ? `${at + 1} of ${steps.length}` : `${routineMinutes(routine)} min`}</span>
      </div>

      {at < 0 && (
        <>
          <ol className="dynamis-steps">
            {routine.stretches.map((stretch) => (
              <li key={stretch.name}>
                <strong>{stretch.name}</strong>
                <span className="muted">{stretch.seconds} s{stretch.sides ? ' each side' : ''}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="button-main" onClick={() => begin(0)}>Start</button>
        </>
      )}

      {step && (
        <section className="dynamis-guide__now">
          <p className="card__eyebrow">{step.side ? `${step.side} side` : 'Hold'}</p>
          <h1 className="title">{step.name}</h1>
          <p className="dynamis-guide__time">{left}</p>
          <p>{step.how}</p>
          <div className="button-row">
            {endsAt ? (
              <button type="button" className="button-quiet" onClick={() => { setPausedLeft(left); setEndsAt(undefined); cancelBell(); }}>Pause</button>
            ) : (
              <button type="button" className="button-quiet" onClick={() => { setEndsAt(Date.now() + left * 1000); setNow(Date.now()); void scheduleBell(left, 1); }}>Carry on</button>
            )}
            <button type="button" className="button-quiet" onClick={() => { cancelBell(); begin(at + 1); }}>Next</button>
          </div>
          {steps[at + 1] && <p className="fine">Next: {steps[at + 1].name}{steps[at + 1].side ? `, ${steps[at + 1].side?.toLowerCase()} side` : ''}</p>}
        </section>
      )}

      {at === steps.length && (
        <section className="card">
          <h2 className="card__title">That&rsquo;s the routine</h2>
          <button type="button" className="button-main" onClick={() => nav.back()}>Done</button>
        </section>
      )}
    </div>
  );
}
