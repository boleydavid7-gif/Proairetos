import type { Effort } from './effort';
import type { Step } from './workouts';

/**
 * The bells for a whole session, worked out before it starts so they can be
 * handed to the phone's audio clock at once. They keep playing with the
 * screen locked, where the page itself is paused. Each change has its own
 * sound: two low bells to walk, one bell to run, one bright bell for faster
 * running, three to finish.
 */
export type Cue = { at: number; bells: number; rate: number; step: number };

/** Seconds between the bells of one cue. */
export const BELL_GAP = 0.9;

export function bellFor(effort: Effort): { bells: number; rate: number } {
  if (effort === 'walk' || effort === 'recovery') return { bells: 2, rate: 0.84 };
  if (effort === 'tempo' || effort === 'hard' || effort === 'stride') return { bells: 1, rate: 1.26 };
  return { bells: 1, rate: 1 };
}

export function cuesFor(steps: readonly Step[]): Cue[] {
  const cues: Cue[] = [];
  let at = 0;
  steps.forEach((step, i) => {
    if (i > 0) cues.push({ at, step: i, ...bellFor(step.effort) });
    at += step.minutes * 60;
  });
  if (steps.length) cues.push({ at, step: steps.length, bells: 3, rate: 1 });
  return cues;
}
