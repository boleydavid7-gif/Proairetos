import type { LifeItem } from '../../core/life-items/types';
import type { Energy } from '../../data/storage/preferences';

export type PlaceGroup = { id: string; label: string; items: LifeItem[] };

const unplaced = (item: LifeItem) =>
  (item.status === 'OPEN' || item.status === 'WAITING') && !item.scheduledAt && !item.repeat && !item.checklist;

/**
 * What could go into open time, grouped by the person's own choices: their
 * path, what they planned for today, and, when they say energy is low, what
 * they marked as taking little. Nothing is ranked; the rest keeps the order
 * it arrived in.
 */
export function placeableGroups(items: readonly LifeItem[], today: string, energy: Energy | undefined): PlaceGroup[] {
  const open = items.filter(unplaced).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const used = new Set<string>();
  const take = (test: (item: LifeItem) => boolean) => {
    const found = open.filter((item) => !used.has(item.id) && test(item));
    found.forEach((item) => used.add(item.id));
    return found;
  };
  const groups: PlaceGroup[] = [
    { id: 'path', label: 'On today’s path', items: take((item) => item.pickedFor === today) },
    { id: 'planned', label: 'Planned for today', items: take((item) => item.plannedFor === today) },
  ];
  if (energy === 'low' || energy === 'some') {
    groups.push({ id: 'light', label: 'Takes little energy', items: take((item) => Boolean(item.light)) });
  }
  groups.push({ id: 'rest', label: 'Everything else', items: take(() => true) });
  return groups.filter((group) => group.items.length > 0);
}
