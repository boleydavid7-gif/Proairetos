import { useEffect, useRef, useState } from 'react';

/**
 * A figure that rolls to its new value instead of jumping (about 450 ms, easing out), as native apps count up a total.
 * The first value shows at once; with reduced motion every value does. Screen readers hear only the value it rolls
 * to (the moving figure is hidden from them), so a live region speaks it once.
 */
/** Out of sight, still read. */
const HIDDEN = { position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 } as const;

export function RollingNumber({ value, format = (n) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value || matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / 450);
      const eased = 1 - (1 - t) ** 3;
      setShown(start + (value - start) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span style={HIDDEN}>{format(value)}</span>
    </>
  );
}
