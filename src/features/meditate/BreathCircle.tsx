import { useEffect, useRef, useState } from 'react';
import { breathAt, stepLabels, type BreathPattern } from '../../core/meditate/breathing';

const RING = 132;
/** How quickly the light follows the breath, in seconds: light swells and settles, it never snaps. */
const LAG = 0.35;
/** Light before a sit begins: a soft, steady glow. */
const RESTING = 0.18;

/**
 * The breathing circle. Still until a sit begins; then it brightens like a
 * lamp turned slowly up on the in-breath, lighting the scene around it, and
 * dims back on the out-breath. Each frame reads `elapsed()`, the same clock
 * as the counts and the cues; the light trails it by a moment, so it
 * swells and settles rather than switching.
 */
export default function BreathCircle({
  pattern,
  elapsed,
  show = 'counts',
  caption,
}: {
  pattern: BreathPattern;
  /** Seconds since the breathing began; absent, the circle rests. */
  elapsed?: () => number;
  /** Counts shows "Breathe in / 4"; words shows just the step; caption shows `caption`; none shows nothing. */
  show?: 'counts' | 'words' | 'caption' | 'none';
  caption?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState(() => {
    const moment = breathAt(elapsed?.() ?? 0, pattern);
    return { step: stepLabels[moment.step.kind], count: moment.count };
  });

  useEffect(() => {
    if (!elapsed) return;
    let frame = 0;
    let last = '';
    let light = RESTING;
    let then = performance.now();
    const draw = (now: number) => {
      const moment = breathAt(elapsed(), pattern);
      // Light rises a touch slower than the circle and lingers at the top, like a filament warming.
      const target = Math.pow(moment.size, 1.35);
      const step = Math.min(0.1, (now - then) / 1000);
      then = now;
      light += (target - light) * (1 - Math.exp(-step / LAG));
      // One number, 0 at rest to 1 at the top of the breath; the CSS turns it into light.
      root.current?.style.setProperty('--light', light.toFixed(4));
      const key = `${moment.index}:${moment.count}:${moment.stepStart}`;
      if (key !== last) {
        last = key;
        setLabel({ step: stepLabels[moment.step.kind], count: moment.count });
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [pattern, elapsed]);

  return (
    <div ref={root} className={`breath-circle${elapsed ? '' : ' breath-circle--still'}`}>
      {/* Light thrown onto the scene around it, wide and soft. */}
      <div className="breath-circle__spill" aria-hidden="true" />
      {/* The bloom just around the ring, where the light is strongest. */}
      <div className="breath-circle__bloom" aria-hidden="true" />
      <svg viewBox="0 0 320 320" aria-hidden="true">
        <defs>
          <radialGradient id="breath-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(255, 244, 222)" stopOpacity="0.32" />
            <stop offset="55%" stopColor="rgb(255, 222, 170)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="rgb(255, 205, 140)" stopOpacity="0.04" />
          </radialGradient>
        </defs>
        <circle className="breath-circle__veil" cx="160" cy="160" r={RING} />
        <circle className="breath-circle__core" cx="160" cy="160" r={RING} fill="url(#breath-core)" />
        <circle className="breath-circle__halo" cx="160" cy="160" r={RING} />
        <circle className="breath-circle__ring" cx="160" cy="160" r={RING} />
      </svg>
      {show !== 'none' && (
        <div className="breath-circle__label" aria-live="polite">
          {show === 'caption' ? (
            <p className="breath-circle__step">{caption}</p>
          ) : (
            <>
              <p className="breath-circle__step">{label.step}</p>
              {show === 'counts' && (
                <p className="breath-circle__count" aria-hidden="true">
                  {label.count}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
