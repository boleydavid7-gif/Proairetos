import { useEffect, useRef } from 'react';
import { useBackHandler } from '../../app/back/backStack';
import { breathPatterns } from '../../core/meditate/breathing';
import BreathCircle from '../meditate/BreathCircle';

const pattern = breathPatterns.find((p) => p.id === 'calm') ?? breathPatterns[0];
const ONE_BREATH_MS = pattern.steps.reduce((total, step) => total + step.seconds, 0) * 1000;

/** One slow breath before the timer begins. Skip is always there; the timer starts when this ends. */
export default function FocusSettle({ onDone }: { onDone: () => void }) {
  const began = useRef(performance.now());
  useBackHandler(true, onDone);

  useEffect(() => {
    const timer = window.setTimeout(onDone, ONE_BREATH_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="focus-screen" role="dialog" aria-modal="true" aria-label="One breath">
      <div className="focus-screen__center">
        <BreathCircle pattern={pattern} elapsed={() => (performance.now() - began.current) / 1000} show="words" />
        <div className="focus-screen__actions">
          <button type="button" className="button-quiet" onClick={onDone}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
