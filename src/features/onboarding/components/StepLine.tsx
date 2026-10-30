import type { CSSProperties } from 'react';

/** How far along: a thin line of the lamp's light that fills as the steps go by. */
export default function StepLine({ count, current }: { count: number; current: number }) {
  return (
    <div
      className="step-line"
      role="progressbar"
      aria-label="Welcome"
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={current + 1}
      aria-valuetext={`Step ${current + 1} of ${count}`}
      style={{ '--p': (current + 1) / count } as CSSProperties}
    >
      <span />
    </div>
  );
}
