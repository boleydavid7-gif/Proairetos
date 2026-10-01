import { useState } from 'react';
import { useClock } from '../../app/hooks/useClock';

type Props = {
  onClose: () => void;
};

const LENGTH_SECONDS = 60;
// Gentle cues, one every ten seconds. Noticing, not instructing.
const cues = [
  'Let the last thing finish.',
  'Notice your feet on the floor.',
  'Let your shoulders drop.',
  'Breathe out a little longer than in.',
  'What is here, right now?',
  'You can arrive slowly.',
];

/** The one-minute arrival moment. A slow breathing circle and a few quiet words. */
export default function PauseScreen({ onClose }: Props) {
  // Measured from the start time, so a dimmed screen or throttled timer never stretches the minute.
  const [startedAt] = useState(() => Date.now());
  const now = useClock(1000).getTime();
  const seconds = Math.floor((now - startedAt) / 1000);
  const done = seconds >= LENGTH_SECONDS;

  // 4 seconds in, 6 seconds out.
  const breathingIn = seconds % 10 < 4;

  return (
    <div className="pause-screen" role="dialog" aria-modal="true" aria-label="Pause">
      <div className="pause-screen__center">
        {done ? (
          <>
            <p className="pause-screen__title">Welcome back to your day.</p>
            <button type="button" className="button-accent" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <div className={`breath ${breathingIn ? 'breath--in' : 'breath--out'}`} aria-hidden="true" />
            <p className="pause-screen__breath" aria-live="polite">
              {breathingIn ? 'Breathe in' : 'Breathe out'}
            </p>
            <p className="pause-screen__cue">{cues[Math.min(cues.length - 1, Math.floor(seconds / 10))]}</p>
            <button type="button" className="button-quiet pause-screen__end" onClick={onClose}>
              End early
            </button>
          </>
        )}
      </div>
    </div>
  );
}
