import { useEffect } from 'react';
import { useClock } from '../../app/hooks/useClock';
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
  onStop: () => void;
  onAnother: () => void;
  onHide: () => void;
};

const RADIUS = 104;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FocusScreen({ session, nextStep, onPause, onResume, onStop, onAnother, onHide }: Props) {
  const now = useClock(1000).getTime();
  const remaining = remainingMs(session, now);
  const finished = isFinished(session, now);
  const progress = 1 - remaining / session.durationMs;

  useEffect(() => {
    if (finished) navigator.vibrate?.(200);
  }, [finished]);

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

        {finished ? (
          <>
            <p className="focus-screen__message">That stretch is done. Take a breath before the next thing.</p>
            <div className="focus-screen__actions">
              <button type="button" className="button-quiet" onClick={onAnother}>
                Another round
              </button>
              <button type="button" className="button-accent" onClick={onStop}>
                Done
              </button>
            </div>
          </>
        ) : (
          <div className="focus-screen__actions">
            <button type="button" className="button-quiet" onClick={onStop}>
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
