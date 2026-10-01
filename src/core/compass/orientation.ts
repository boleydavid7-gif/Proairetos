import type { LifeItem } from '../life-items/types';
import type { ChosenValue } from '../values/types';
import type { CompassStatement } from './types';

export interface DailyOrientation {
  values: string[];
  remember: string[];
  pushedAside: string[];
  /** The person's own items scheduled for the given day, in time order. */
  scheduledToday: LifeItem[];
  prompt: string;
}

export const orientationPrompt = 'What would you like to keep in sight today?';

function sameLocalDay(iso: string, day: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate()
  );
}

/**
 * The look-ahead: shows the person their own chosen values, statements,
 * and what they scheduled for today.
 *
 * It reflects back what the person wrote and adds nothing of its own:
 * no focus selection, no advice, no adjustment based on inferred state.
 */
export function createDailyOrientation(
  values: ChosenValue[],
  statements: CompassStatement[],
  items: LifeItem[],
  today: Date,
): DailyOrientation {
  const byOldest = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);

  return {
    values: [...values].sort((a, b) => a.chosenAt.localeCompare(b.chosenAt)).map((value) => value.name),
    remember: statements.filter((s) => s.type === 'REMEMBER').sort(byOldest).map((s) => s.body),
    pushedAside: statements.filter((s) => s.type === 'PUSHED_ASIDE').sort(byOldest).map((s) => s.body),
    scheduledToday: items
      .filter((item) => (item.status === 'OPEN' || item.status === 'WAITING') && item.scheduledAt)
      .filter((item) => sameLocalDay(item.scheduledAt!, today))
      .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!)),
    prompt: orientationPrompt,
  };
}
