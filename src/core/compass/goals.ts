import type { CompassStatement } from './types';
import type { ItemEvent } from '../item-events/types';
import type { LifeItem } from '../life-items/types';

export type GoalRecord = {
  /** Steps still open, oldest first. */
  open: LifeItem[];
  /** Steps done, most recent first, with when. A record to look back on; never a percentage or a target. */
  done: { item: LifeItem; at: string }[];
};

export function goalRecord(goalId: string, items: readonly LifeItem[], events: readonly ItemEvent[]): GoalRecord {
  const steps = items.filter((item) => item.goalId === goalId);
  const lastDone = new Map<string, string>();
  for (const event of events) {
    if (event.kind !== 'COMPLETED') continue;
    const before = lastDone.get(event.itemId);
    if (!before || event.timestamp > before) lastDone.set(event.itemId, event.timestamp);
  }
  return {
    open: steps
      .filter((item) => item.status === 'OPEN' || item.status === 'WAITING')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    done: steps
      .filter((item) => item.status === 'DONE')
      .map((item) => ({ item, at: lastDone.get(item.id) ?? item.updatedAt }))
      .sort((a, b) => b.at.localeCompare(a.at)),
  };
}

/**
 * What a block of time set aside for a goal says beside it: the goal, and
 * its oldest open step if there is one. A line to start from, not a task
 * the block must finish.
 */
export function goalLines(
  goals: readonly CompassStatement[],
  items: readonly LifeItem[],
  patterns: readonly { id: string; name: string }[] = [],
): Map<string, string> {
  const lines = new Map<string, string>();
  for (const goal of goals) {
    if (goal.type !== 'GOAL' || !goal.patternId) continue;
    const step = goalRecord(goal.id, items, []).open[0];
    // When the time already carries the goal's name, the line only adds the step.
    const named = patterns.find((pattern) => pattern.id === goal.patternId)?.name === goal.body;
    const parts = [named ? '' : `For ${goal.body}`, step ? `Next: ${step.title}` : ''].filter(Boolean);
    if (parts.length) lines.set(goal.patternId, parts.join(' · '));
  }
  return lines;
}
