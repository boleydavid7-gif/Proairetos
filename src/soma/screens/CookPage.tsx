import { useEffect, useRef, useState } from 'react';
import type { Nav } from '../app/App';
import { useRecipes, useSettings, useToday } from '../app/state';
import { BackLink } from '../app/ui';
import { gatherList, ovenHeats, stepsWithAmounts } from '../core/cookAids';
import { isHeading, servingsNumber } from '../core/recipes';
import { loadSettings, saveSettings } from '../data/store';
import { StepTimers, TimerTray } from './RecipePage';
import { listeningHere, says, useListening } from '../../app/family/voice';
import { startTimer, useTimers } from '../app/timers';
import { timerName } from '../core/cookAids';
import { timersIn } from '../core/recipes';

function say(text: string) {
  try {
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  } catch {
    // No voice on this device.
  }
}

/**
 * Cooking: first what to take out (and the oven), then one step at a time
 * in large type with each amount beside its first mention. The screen
 * stays awake, timers run together, steps can be read aloud and "next" or
 * "back" said instead of tapped.
 */
export default function CookPage({ nav, id, servings }: { nav: Nav; id: string; servings?: number }) {
  const recipe = useRecipes()?.find((each) => each.id === id);
  const settings = useSettings();
  const today = useToday();
  // -1 is Gather, before the first step.
  const [at, setAt] = useState(-1);
  const lock = useRef<{ release(): Promise<void> } | null>(null);
  const move = useRef<(by: number | 'again') => void>(() => undefined);

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
      try {
        speechSynthesis.cancel();
      } catch {
        // Nothing was speaking.
      }
    };
  }, []);

  const base = servingsNumber(recipe?.servings);
  const factor = base && servings ? servings / base : 1;
  const steps = recipe ? stepsWithAmounts(recipe.steps, recipe.ingredients, factor, settings.units).filter((step) => !isHeading(step)) : [];
  const step = at >= 0 ? steps[at] : undefined;

  // Read each step aloud as it comes, when chosen.
  useEffect(() => {
    if (settings.readAloud && step) say(`Step ${at + 1}. ${step}`);
  }, [at, settings.readAloud, step]);

  move.current = (by) => {
    if (by === 'again') {
      if (step) say(step);
      return;
    }
    setAt((now) => Math.max(-1, Math.min(steps.length - 1, now + by)));
  };

  // Listening for "next", "back", "again" and "timer", when chosen.
  const timers = useTimers();
  useListening(settings.listen, (words) => {
    if (says(words, 'next')) move.current(1);
    else if (says(words, 'back', 'previous')) move.current(-1);
    else if (says(words, 'again', 'repeat')) move.current('again');
    else if (says(words, 'timer') && step) {
      // The step's first timer that is not running yet.
      const first = timersIn(step).find(({ label }) => !timers.some((timer) => timer.label === label && !timer.done));
      if (first) startTimer(first.label, first.minutes, timerName(step, first.label));
    }
  });

  if (!recipe) return null;
  const heats = ovenHeats(recipe.steps, settings.units);
  const finish = () => {
    const now = loadSettings();
    if (now.pauseBeforeEating && now.pauseOfferedOn !== today) {
      saveSettings({ ...now, pauseOfferedOn: today });
      nav.swap({ name: 'pause', id: recipe.id });
    } else nav.back();
  };

  return (
    <div className="cook">
      <BackLink label="Done cooking" onBack={nav.back} />
      <div className="cook__switches">
        <button type="button" className="chip chip--small" aria-pressed={settings.readAloud} onClick={() => saveSettings({ ...loadSettings(), readAloud: !settings.readAloud })}>
          Read aloud
        </button>
        {listeningHere() && (
          <button type="button" className="chip chip--small" aria-pressed={settings.listen} onClick={() => saveSettings({ ...loadSettings(), listen: !settings.listen })}>
            Say “next” or “timer”
          </button>
        )}
      </div>
      <TimerTray />

      {at === -1 ? (
        <>
          <p className="cook__count">Before you start · {recipe.title}</p>
          {heats.length > 0 && <p className="cook__step cook__step--small">Heat the oven to {heats[0]}.</p>}
          <h2 className="label">Take out</h2>
          <ul className="check-list">
            {gatherList(recipe.ingredients, factor, settings.units).map((each, i) =>
              each.heading ? (
                <li key={i} className="check-list__heading">
                  {each.heading}
                </li>
              ) : (
                <li key={i} className="check-row">
                  {each.line}
                </li>
              ),
            )}
          </ul>
        </>
      ) : (
        <>
          <p className="cook__count">
            Step {at + 1} of {steps.length} · {recipe.title}
          </p>
          {step && <p className="cook__step">{step}</p>}
          {step && <StepTimers step={step} />}
        </>
      )}

      <div className="cook__nav">
        <button type="button" className="button-quiet" disabled={at === -1} onClick={() => setAt(at - 1)}>
          Back a step
        </button>
        {at < steps.length - 1 ? (
          <button type="button" className="button-main" onClick={() => setAt(at + 1)}>
            {at === -1 ? 'Start' : 'Next step'}
          </button>
        ) : (
          <button type="button" className="button-main" onClick={finish}>
            Finished
          </button>
        )}
      </div>
    </div>
  );
}
