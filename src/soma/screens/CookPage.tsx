import { useEffect, useRef, useState } from 'react';
import type { Nav } from '../app/App';
import { useRecipes } from '../app/state';
import { BackLink } from '../app/ui';
import { scaleLine } from '../core/ingredients';
import { headingText, isHeading, servingsNumber } from '../core/recipes';
import { StepTimers } from './RecipePage';

/** Cooking: one step at a time in large type, the screen kept awake, timers a tap away. */
export default function CookPage({ nav, id, servings }: { nav: Nav; id: string; servings?: number }) {
  const recipe = useRecipes()?.find((each) => each.id === id);
  const [at, setAt] = useState(0);
  const [showing, setShowing] = useState(false);
  const lock = useRef<{ release(): Promise<void> } | null>(null);

  useEffect(() => {
    const wakeLock = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock;
    const hold = () =>
      void wakeLock
        ?.request('screen')
        .then((held) => (lock.current = held))
        .catch(() => undefined);
    hold();
    const again = () => document.visibilityState === 'visible' && hold();
    document.addEventListener('visibilitychange', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      void lock.current?.release().catch(() => undefined);
    };
  }, []);

  if (!recipe) return null;
  const steps = recipe.steps.filter((step) => !isHeading(step));
  const base = servingsNumber(recipe.servings);
  const factor = base && servings ? servings / base : 1;
  const step = steps[at];

  return (
    <div className="cook">
      <BackLink label="Done cooking" onBack={nav.back} />
      <p className="cook__count">
        Step {at + 1} of {steps.length} · {recipe.title}
      </p>
      {step && <p className="cook__step">{step}</p>}
      {step && <StepTimers step={step} />}

      <details className="more-about" open={showing} onToggle={(event) => setShowing((event.target as HTMLDetailsElement).open)}>
        <summary>Ingredients</summary>
        <ul className="check-list">
          {recipe.ingredients.map((line, i) =>
            isHeading(line) ? (
              <li key={i} className="check-list__heading">
                {headingText(line)}
              </li>
            ) : (
              <li key={i} className="check-row">
                {scaleLine(line, factor)}
              </li>
            ),
          )}
        </ul>
      </details>

      <div className="cook__nav">
        <button type="button" className="button-quiet" disabled={at === 0} onClick={() => setAt(at - 1)}>
          Back a step
        </button>
        {at < steps.length - 1 ? (
          <button type="button" className="button-main" onClick={() => setAt(at + 1)}>
            Next step
          </button>
        ) : (
          <button type="button" className="button-main" onClick={nav.back}>
            Finished
          </button>
        )}
      </div>
    </div>
  );
}
