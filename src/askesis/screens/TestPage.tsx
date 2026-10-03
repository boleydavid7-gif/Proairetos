import { useEffect, useRef, useState } from 'react';
import { tap } from '../../app/feel';
import type { Nav } from '../app/App';
import { BackLink } from '../app/ui';
import { runAnswerFor, runChoices } from '../core/plans';
import { lengthLabel } from '../core/workouts';

const WARM_UP = 5 * 60;
const LONGEST = 60 * 60;
const TEST_KEY = 'askesis:startTest';

const clock = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/**
 * A test run, for anyone unsure how long they can run: five minutes of brisk
 * walking, then easy running until they would rather walk. Only the time is
 * kept, as the answer to "how long can you run without stopping".
 */
export default function TestPage({ nav }: { nav: Nav }) {
  const [phase, setPhase] = useState<'ready' | 'warm' | 'run' | 'done'>('ready');
  const [since, setSince] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [ran, setRan] = useState(0);
  const lock = useRef<{ release(): Promise<void> } | null>(null);

  useEffect(() => {
    if (phase !== 'warm' && phase !== 'run') return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    const wakeLock = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock;
    void wakeLock
      ?.request('screen')
      .then((held) => (lock.current = held))
      .catch(() => undefined);
    return () => {
      window.clearInterval(timer);
      void lock.current?.release().catch(() => undefined);
    };
  }, [phase]);

  const elapsed = (now - since) / 1000;
  const startRun = () => {
    tap(40);
    setSince(Date.now());
    setNow(Date.now());
    setPhase('run');
  };
  const stop = (seconds: number) => {
    tap(60);
    setRan(seconds);
    setPhase('done');
  };
  useEffect(() => {
    if (phase === 'warm' && elapsed >= WARM_UP) startRun();
    if (phase === 'run' && elapsed >= LONGEST) stop(LONGEST);
  });

  const use = () => {
    try {
      const kept = JSON.parse(localStorage.getItem(TEST_KEY) ?? '{}');
      localStorage.setItem(TEST_KEY, JSON.stringify({ ...kept, run: runAnswerFor(ran / 60) }));
    } catch {
      // The answer can still be picked by hand.
    }
    nav.back();
  };

  return (
    <div className="guide test-run">
      <div className="guide__top">
        <BackLink label={phase === 'ready' || phase === 'done' ? 'Back' : 'Leave'} onBack={nav.back} />
      </div>
      {phase === 'ready' && (
        <div className="guide__now">
          <h1 className="guide__effort">A test run</h1>
          <p className="guide__talk">Five minutes of brisk walking, then run easy until you would rather walk. Then tap.</p>
          <button
            type="button"
            className="button-main"
            onClick={() => {
              setSince(Date.now());
              setNow(Date.now());
              setPhase('warm');
            }}
          >
            Start walking
          </button>
        </div>
      )}
      {phase === 'warm' && (
        <div className="guide__now">
          <h1 className="guide__effort">Walk briskly</h1>
          <p className="guide__time">{clock(WARM_UP - elapsed)}</p>
          <button type="button" className="button-quiet" onClick={startRun}>
            Start running now
          </button>
        </div>
      )}
      {phase === 'run' && (
        <div className="guide__now">
          <h1 className="guide__effort">Run easy</h1>
          <p className="guide__talk">At a pace where you could talk.</p>
          <p className="guide__time">{clock(elapsed)}</p>
          <button type="button" className="button-main test-run__stop" onClick={() => stop(elapsed)}>
            I’m walking now
          </button>
        </div>
      )}
      {phase === 'done' && (
        <div className="guide__now">
          <h1 className="guide__effort">{ran < 30 ? 'That’s the test.' : `${lengthLabel(Math.floor(ran / 60) || ran / 60)} of running.`}</h1>
          <p className="guide__talk">{runChoices.find((each) => each.id === runAnswerFor(ran / 60))?.label}.</p>
          <button type="button" className="button-main" onClick={use}>
            Use this
          </button>
          <button type="button" className="button-quiet" onClick={nav.back}>
            Not now
          </button>
        </div>
      )}
    </div>
  );
}
