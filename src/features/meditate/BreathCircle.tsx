import { useEffect, useRef, useState } from 'react';
import { breathAt, stepLabels, type BreathPattern } from '../../core/meditate/breathing';

const RING = 132;
/**
 * The breathing circle. A plain ring until a sit begins; then, as the breath
 * goes out, a soft glow gathers around the ring, and it eases away again on
 * the in-breath. Each frame reads `elapsed()`, the same clock as the counts
 * and the cues, and the glow is read straight from it, so it rises and falls
 * exactly with the breath. Nothing grows or moves.
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
      // The glow is the breath's emptiness: none when full, its most when the breath is out.
      const glow = 1 - moment.size;
      // One number, 0 for a plain ring to 1 for the full glow; the CSS turns it into light.
      root.current?.style.setProperty('--glow', glow.toFixed(4));
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
      {/* The glow is soft shadow around a circle, not a blurred drawing: phones' browsers draw it the same. */}
      <div className="breath-circle__glow breath-circle__glow--wide" aria-hidden="true" />
      <div className="breath-circle__glow breath-circle__glow--near" aria-hidden="true" />
      <svg viewBox="0 0 320 320" aria-hidden="true">
        <circle className="breath-circle__ring" cx="160" cy="160" r={RING} />
      </svg>
      <div className="breath-circle__lit" aria-hidden="true" />
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
