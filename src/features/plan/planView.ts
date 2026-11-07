import type { LifeItem, PlanGroup } from '../../core/life-items/types';
import { toLocalDate } from '../../core/scheduling/dates';

export type PlanSectionId = 'IMPORTANT' | PlanGroup | 'OTHER';

export type PlanSection = { id: PlanSectionId; label: string; open: LifeItem[]; done: LifeItem[] };

export const planSectionLabels: Record<PlanSectionId, string> = {
  IMPORTANT: 'Important',
  MAINTENANCE: 'Maintenance',
  MEANINGFUL: 'Meaningful',
  OTHER: 'Not grouped',
};

const order: PlanSectionId[] = ['IMPORTANT', 'MAINTENANCE', 'MEANINGFUL', 'OTHER'];

const isOpen = (item: LifeItem) => item.status === 'OPEN' || item.status === 'WAITING';

/** The day an item belongs to, if the person gave it one. */
export function itemDay(item: LifeItem): string | undefined {
  if (item.plannedFor) return item.plannedFor;
  if (item.scheduledAt) return toLocalDate(new Date(item.scheduledAt));
  return item.pickedFor;
}

/** Something to do rather than a thought or feeling: grouped, marked, or sorted as a doing item. */
function isPlanItem(item: LifeItem): boolean {
  return Boolean(item.planGroup || item.important || item.type === 'DO' || item.type === 'MAKE_TIME_FOR');
}

function sectionOf(item: LifeItem): PlanSectionId {
  if (item.important) return 'IMPORTANT';
  return item.planGroup ?? 'OTHER';
}

/**
 * The checklist for one day. A dated item shows on its day; on today it also
 * shows if its day has passed and it is still open, without any label for
 * that. Undated doing items show on today. Things closed that day stay,
 * checked, so a tap can reopen them.
 */
export function planFor(
  date: string,
  today: string,
  items: LifeItem[],
  range?: { start: Date; end: Date },
): PlanSection[] {
  const isToday = date === today;
  // Closed during that day: the person's own day when known, else the calendar date.
  const closedOn = (item: LifeItem) => {
    if (!range) return toLocalDate(new Date(item.updatedAt)) === date;
    const at = new Date(item.updatedAt).getTime();
    return at >= range.start.getTime() && at < range.end.getTime();
  };
  const belongs = (item: LifeItem) => {
    const day = itemDay(item);
    if (day) return day === date || (isToday && day < today && isOpen(item));
    return isToday && isPlanItem(item);
  };

  const open = items.filter((item) => isOpen(item) && belongs(item));
  const done = items.filter(
    (item) => item.status === 'DONE' && closedOn(item) && (itemDay(item) === date || isPlanItem(item)),
  );
  const byCreated = (a: LifeItem, b: LifeItem) => a.createdAt.localeCompare(b.createdAt);

  return order
    .map((id) => ({
      id,
      label: planSectionLabels[id],
      open: open.filter((item) => sectionOf(item) === id).sort(byCreated),
      done: done.filter((item) => sectionOf(item) === id).sort(byCreated),
    }))
    .filter((section) => section.open.length + section.done.length > 0);
}
