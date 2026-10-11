import { useEffect, useRef, useState } from 'react';
import { between, figureFor } from '../core/figures';
import { figureMarkup } from '../core/figureSvg';

const PERIOD = 3200;
const quiet = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * An exercise drawn as a line figure. Moving, it goes from the start of the movement to the end and back, only while
 * in view; with reduced motion (or `still`), the start and end stand side by side, or just the end when small.
 */
export default function ExerciseFigure({ id, step, size = 96, still = false }: { id: string; step?: number; size?: number; still?: boolean }) {
  const poses = figureFor(id, step);
  const box = useRef<HTMLSpanElement>(null);
  const [t, setT] = useState(1);
  const moving = !still && !quiet();

  useEffect(() => {
    if (!moving || !poses || !box.current) return;
    let frame = 0;
    let visible = false;
    const started = performance.now();
    const tick = (now: number) => {
      const phase = ((now - started) % PERIOD) / PERIOD;
      setT((1 - Math.cos(phase * Math.PI * 2)) / 2);
      if (visible) frame = requestAnimationFrame(tick);
    };
    const watch = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(tick);
    });
    watch.observe(box.current);
    return () => {
      watch.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [moving, id, step]);

  if (!poses) return null;
  const frames = moving || size < 80 ? [moving ? between(poses[0], poses[1], t) : poses[1]] : poses;
  return (
    <span ref={box} className="dynamis-figure" aria-hidden="true">
      {frames.map((pose, index) => (
        <svg key={index} viewBox="0 0 100 100" width={size} height={size} dangerouslySetInnerHTML={{ __html: figureMarkup(pose) }} />
      ))}
    </span>
  );
}
