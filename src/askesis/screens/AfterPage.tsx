import { useEffect, useRef, useState } from 'react';
import { reflectionService } from '../../app/services';
import { breathAt, breathPattern, stepLabels } from '../../core/meditate/breathing';
import type { Nav } from '../app/App';
import { useEntries, useSettings } from '../app/state';
import { useUndo } from '../app/ui';
import { saveSettings } from '../data/store';

const MINUTE = 60;

/**
 * After a workout is saved: relief, not praise. Two quiet offers, both
 * skippable: a minute of slow breathing to cool down, and one line kept in
 * Proairetos's Reflect. "Not for me" sets them aside; Settings brings them back.
 */
export default function AfterPage({ nav, id }: { nav: Nav; id: string }) {
  const settings = useSettings();
  const undo = useUndo();
  const entry = useEntries()?.find((each) => each.id === id);
  const [breathing, setBreathing] = useState(false);
  const [line, setLine] = useState('');
  const [kept, setKept] = useState(false);

  const keep = async () => {
    if (!line.trim()) return;
    const title = entry?.workoutTitle ?? 'A run';
    const reflection = await reflectionService.write({ body: `${title}: ${line.trim()}`, kind: 'FREE', promptKey: 'after-run' });
    setKept(true);
    undo('Kept in Reflect', () => void reflectionService.remove(reflection.id));
  };

  return (
    <div className="page after">
      <h1 className="title">That’s recorded.</h1>
      <p className="lead">Nothing else is needed. If you like:</p>

      {settings.afterOffers && (
        <>
          <section className="card">
            <h2 className="card__title card__title--small">A minute to cool down</h2>
            {breathing ? (
              <CoolDown onDone={() => setBreathing(false)} />
            ) : (
              <>
                <p className="muted">Slow breaths, out longer than in, while your heart rate settles.</p>
                <button type="button" className="button-quiet" onClick={() => setBreathing(true)}>
                  Breathe for a minute
                </button>
              </>
            )}
          </section>

          <section className="card">
            <h2 className="card__title card__title--small">One line to keep</h2>
            {kept ? (
              <p className="muted">Kept in Reflect, in Proairetos.</p>
            ) : (
              <>
                <label className="field">
                  <span className="hint">What was up to you in this run, and how did you meet it?</span>
                  <input className="input" value={line} placeholder="Optional" onChange={(event) => setLine(event.target.value)} />
                </label>
                <button type="button" className="button-quiet" disabled={!line.trim()} onClick={() => void keep()}>
                  Keep it in Reflect
                </button>
              </>
            )}
          </section>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              saveSettings({ ...settings, afterOffers: false });
              undo('Set aside. Settings can bring it back.', () => saveSettings({ ...settings, afterOffers: true }));
            }}
          >
            Not for me
          </button>
        </>
      )}

      <button type="button" className="button-main" onClick={() => nav.swap({ name: 'log' })}>
        Done
      </button>
    </div>
  );
}

function CoolDown({ onDone }: { onDone: () => void }) {
  const pattern = breathPattern('calm');
  const started = useRef(performance.now());
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const elapsed = (performance.now() - started.current) / 1000;
      setSeconds(elapsed);
      if (elapsed >= MINUTE) onDone();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  const moment = breathAt(seconds, pattern);
  return (
    <div className="cool-down">
      <div className="cool-down__circle" style={{ transform: `scale(${0.55 + 0.45 * moment.size})` }} aria-hidden="true" />
      <p className="cool-down__word" aria-live="polite">
        {stepLabels[moment.step.kind]}
      </p>
      <button type="button" className="text-link" onClick={onDone}>
        Stop
      </button>
    </div>
  );
}
