import type { CompassStatement } from './types';

export interface DailyOrientation {
  values: string[];
  remember: string[];
  pushedAside: string[];
  prompt: string;
}

export const orientationPrompt = 'What would you like to keep in sight today?';

/**
 * Morning orientation: shows the person their own chosen values and statements.
 *
 * It reflects back what the person wrote and adds nothing of its own:
 * no focus selection, no advice, no adjustment based on inferred state.
 */
export function createDailyOrientation(
  values: string[],
  statements: CompassStatement[],
): DailyOrientation {
  return {
    values: [...values],
    remember: statements.filter((s) => s.type === 'REMEMBER').map((s) => s.body),
    pushedAside: statements.filter((s) => s.type === 'PUSHED_ASIDE').map((s) => s.body),
    prompt: orientationPrompt,
  };
}
