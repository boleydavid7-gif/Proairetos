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
