import { useBackHandler } from '../../app/back/backStack';
import { useEffect, useState, type FormEvent } from 'react';
import { useClock } from '../../app/hooks/useClock';
import { lifeService } from '../../app/services';
import {
  formatClockDown,
  isFinished,
  remainingMs,
  type FocusSession,
} from '../../core/focus/session';

type Props = {
  session: FocusSession;
  nextStep?: string;
  onPause: () => void;
  onResume: () => void;
  /** Ends the session, with an optional note on where the person left off. */
  onStop: (leftOff?: string) => void;
  onAnother: () => void;
  onHide: () => void;
};

const RADIUS = 104;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FocusScreen({ session, nextStep, onPause, onResume, onStop, onAnother, onHide }: Props) {
  useBackHandler(true, onHide);
  const now = useClock(1000).getTime();
  const remaining = remainingMs(session, now);
  const finished = isFinished(session, now);
  const progress = 1 - remaining / session.durationMs;

  const [wrappingUp, setWrappingUp] = useState(false);
  const [leftOff, setLeftOff] = useState('');
  const [parking, setParking] = useState(false);
  const [thought, setThought] = useState('');
  const [parked, setParked] = useState(false);

  // A stray thought goes to Capture, unsorted, so the stretch can carry on.
  async function park(event: FormEvent) {
    event.preventDefault();
    const text = thought.trim();
    if (!text) return;
    await lifeService.add(text, undefined);
    setThought('');
    setParking(false);
    setParked(true);
    window.setTimeout(() => setParked(false), 2500);
  }

  useEffect(() => {
    if (finished) navigator.vibrate?.(200);
  }, [finished]);

  // Before switching away, a short note on where you stopped makes it easier to come back.
  const stop = () => (session.itemId ? setWrappingUp(true) : onStop());

  if (wrappingUp) {
    return (
      <div className="focus-screen" role="dialog" aria-modal="true" aria-label="Finish focus">
        <form
          className="focus-screen__center focus-wrap"
          onSubmit={(event) => {
            event.preventDefault();
            onStop(leftOff);
          }}
        >
          <p className="focus-screen__item">Where did you leave off?</p>
          <p className="focus-screen__message">A few words now make it easier to pick up later. It becomes the next step.</p>
          <input
            className="field-input"
            aria-label="Where you left off"
            placeholder="e.g. halfway through section 2"
            maxLength={140}
            autoFocus
            value={leftOff}
            onChange={(event) => setLeftOff(event.target.value)}
          />
          <div className="focus-screen__actions">
            <button type="button" className="button-quiet" onClick={() => onStop()}>
              Skip
            </button>
            <button type="submit" className="button-accent" disabled={!leftOff.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="focus-screen" role="dialog" aria-modal="true" aria-label="Focus">
      <button type="button" className="focus-screen__hide" onClick={onHide}>
        Hide
      </button>

      <div className="focus-screen__center">
        {session.itemTitle && <p className="focus-screen__item">{session.itemTitle}</p>}
        {nextStep && <p className="focus-screen__step">Next step: {nextStep}</p>}

        <div className="focus-ring">
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r={RADIUS} className="focus-ring__track" />
            <circle
              cx="120"
              cy="120"
              r={RADIUS}
              className="focus-ring__progress"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            />
          </svg>
          <div className="focus-ring__label" aria-live="off">
            {finished ? (
              <span className="focus-ring__done">Time</span>
            ) : (
              <>
                <span className="focus-ring__time">{formatClockDown(remaining)}</span>
                {session.pausedAt && <span className="focus-ring__paused">Paused</span>}
              </>
            )}
          </div>
        </div>

        {!finished &&
          (parking ? (
            <form className="focus-park" onSubmit={park}>
              <input
                className="field-input"
                aria-label="A thought to set aside"
                placeholder="Write it down, then back to it"
                maxLength={200}
                value={thought}
                onChange={(event) => setThought(event.target.value)}
                ref={(el) => el?.focus()}
              />
              <button type="submit" className="button-accent" disabled={!thought.trim()}>
                Set aside
              </button>
              <button type="button" className="button-quiet" onClick={() => setParking(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <button type="button" className="text-link focus-park__open" onClick={() => setParking(true)}>
              {parked ? 'Set aside in Capture' : 'Set a thought aside'}
            </button>
          ))}

        {finished ? (
          <>
            <p className="focus-screen__message">That stretch is done. Take a breath before the next thing.</p>
            <div className="focus-screen__actions">
              <button type="button" className="button-quiet" onClick={onAnother}>
                Another round
              </button>
              <button type="button" className="button-accent" onClick={stop}>
                Done
              </button>
            </div>
          </>
        ) : (
          <div className="focus-screen__actions">
            <button type="button" className="button-quiet" onClick={stop}>
              Stop
            </button>
            {session.pausedAt ? (
              <button type="button" className="button-accent" onClick={onResume}>
                Resume
              </button>
            ) : (
              <button type="button" className="button-accent" onClick={onPause}>
                Pause
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
