import { useEffect, useRef, useState } from 'react';
import { breathAt, stepLabels, type BreathPattern } from '../../core/meditate/breathing';

const RING = 132;

/**
 * The breathing circle. Still until a sit begins; then it glows outward on
 * the in-breath and dims back on the out-breath, drawing every frame from
 * `elapsed()`, the same clock as the counts and the cues.
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
    const draw = () => {
      const moment = breathAt(elapsed(), pattern);
      // One number, 0 at rest to 1 at the top of the breath; the CSS turns it into light.
      root.current?.style.setProperty('--breath', moment.size.toFixed(3));
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
      <div className="breath-circle__aura" aria-hidden="true" />
      <svg viewBox="0 0 320 320" aria-hidden="true">
        <defs>
          <radialGradient id="breath-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 214, 160, 0.2)" />
            <stop offset="75%" stopColor="rgba(255, 196, 130, 0.08)" />
            <stop offset="100%" stopColor="rgba(255, 196, 130, 0.02)" />
          </radialGradient>
        </defs>
        <circle className="breath-circle__veil" cx="160" cy="160" r={RING} />
        <circle className="breath-circle__fill" cx="160" cy="160" r={RING} fill="url(#breath-fill)" />
        <circle className="breath-circle__glow" cx="160" cy="160" r={RING} />
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
