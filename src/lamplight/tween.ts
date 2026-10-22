import { useEffect, useRef, useState } from 'react';

/*
 * Figures that travel to their new values instead of jumping: a chart's bars and points, a meter's fill. The first
 * values can grow in from a starting value (`from`, e.g. 0 for bars rising off their baseline); later changes go
 * from wherever the figures are now. A change in how many there are lands at once (nothing to travel from). With
 * reduced motion every value lands at once.
 */

export type Easing = (t: number) => number;
export const easeOut: Easing = (t) => 1 - (1 - t) ** 3;
/** Settles with a small overshoot, like the family's lively spring. */
export const easeSpring: Easing = (t) => {
  const c = 1.4;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useTweened(target: readonly number[], { ms = 560, from, ease = easeOut, delay = 0, stagger = 0 }: { ms?: number; from?: number; ease?: Easing; delay?: number; /** Each next value starts this much later (ms), so a row of bars rises left to right. */ stagger?: number } = {}): number[] {
  const first = useRef(true);
  const [shown, setShown] = useState<number[]>(() => (from !== undefined && !still() ? target.map(() => from) : [...target]));
  const now = useRef(shown);
  now.current = shown;
  const key = target.join(',');

  useEffect(() => {
    const start = now.current;
    const grow = first.current && from !== undefined;
    first.current = false;
    if (still() || start.length !== target.length || (!grow && start.every((value, index) => value === target[index]))) {
      setShown([...target]);
      return;
    }
    let frame = 0;
    let began = 0;
    const step = (time: number) => {
      if (!began) began = time + delay;
      let done = true;
      setShown(
        target.map((value, index) => {
          const t = Math.max(0, Math.min(1, (time - began - index * stagger) / ms));
          if (t < 1) done = false;
          return start[index] + (value - start[index]) * ease(t);
        }),
      );
      if (!done) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // The values themselves, by their key; the options are fixed per chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return shown.length === target.length ? shown : [...target];
}
