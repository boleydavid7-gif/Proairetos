import { useEffect, useRef, useState } from 'react';
import { breathAt, stepLabels, type BreathPattern } from '../../core/meditate/breathing';

const RING = 140;
const INNER_MIN = 70;
const INNER_MAX = 134;

/**
 * The breathing circle: the glow opens on the in-breath and closes on the
 * out-breath, and the dot travels once around the ring each cycle. It
 * draws every frame from `elapsed()`, so it never drifts from the counts
 * or the breath sounds that read the same clock.
 */
export default function BreathCircle({
  pattern,
  elapsed,
  show = 'counts',
  caption,
}: {
  pattern: BreathPattern;
  /** Seconds since the breathing began. */
  elapsed: () => number;
  /** Counts shows "Breathe in / 4"; words shows just the step; caption shows `caption`. */
  show?: 'counts' | 'words' | 'caption';
  caption?: string;
}) {
  const inner = useRef<SVGCircleElement>(null);
  const glow = useRef<SVGCircleElement>(null);
  const dot = useRef<SVGGElement>(null);
  const [label, setLabel] = useState(() => {
    const moment = breathAt(elapsed(), pattern);
    return { step: stepLabels[moment.step.kind], count: moment.count };
  });

  useEffect(() => {
    let frame = 0;
    let last = '';
    const draw = () => {
      const moment = breathAt(elapsed(), pattern);
      const radius = INNER_MIN + (INNER_MAX - INNER_MIN) * moment.size;
      inner.current?.setAttribute('r', radius.toFixed(2));
      glow.current?.setAttribute('opacity', (0.25 + moment.size * 0.55).toFixed(3));
      const angle = moment.cycle * Math.PI * 2 - Math.PI / 2;
      dot.current?.setAttribute('transform', `translate(${(160 + RING * Math.cos(angle)).toFixed(2)} ${(160 + RING * Math.sin(angle)).toFixed(2)})`);
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
    <div className="breath-circle">
      <svg viewBox="0 0 320 320" aria-hidden="true">
        <defs>
          <radialGradient id="breath-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 214, 160, 0.22)" />
            <stop offset="70%" stopColor="rgba(255, 196, 130, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 196, 130, 0.02)" />
          </radialGradient>
        </defs>
        <circle className="breath-circle__veil" cx="160" cy="160" r={RING} />
        <circle ref={glow} className="breath-circle__glow" cx="160" cy="160" r={RING} opacity="0.3" />
        <circle ref={inner} cx="160" cy="160" r={INNER_MIN} fill="url(#breath-fill)" />
        <circle className="breath-circle__ring" cx="160" cy="160" r={RING} />
        <g ref={dot} transform={`translate(160 ${160 - RING})`}>
          <circle className="breath-circle__halo" r="14" />
          <circle className="breath-circle__dot" r="8" />
        </g>
      </svg>
      <div className="breath-circle__label" aria-live="polite">
        {show === 'caption' ? (
          <p className="breath-circle__step">{caption}</p>
        ) : (
          <>
            <p className="breath-circle__step">{label.step}</p>
            {show === 'counts' && <p className="breath-circle__count">{label.count}</p>}
          </>
        )}
      </div>
    </div>
  );
}
