import type { LifeItem } from '../life-items/types';
import type { ScheduleOccurrence } from '../scheduling/types';
import type { CalendarEvent } from './ics';

/** What the person chose to put in their calendar. Off unless chosen, except commitments. */
export type FeedOptions = {
  /** Committed blocks from the schedule (work, study, care). */
  shifts: boolean;
  /** Title them with their own labels ("Class") instead of a plain "Busy". */
  shiftLabels: boolean;
  /** Protected time blocks, titled "Protected time". */
  protectedTime: boolean;
  /** Dated or timed items, with their titles. */
  tasks: boolean;
};

export const defaultFeedOptions: FeedOptions = { shifts: true, shiftLabels: false, protectedTime: false, tasks: false };

/** Timed items are shown as half an hour, since an item has a time but no length. */
const ITEM_MINUTES = 30;

export function feedEvents(occurrences: readonly ScheduleOccurrence[], items: readonly LifeItem[], options: FeedOptions): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const occurrence of occurrences) {
    const isWork = occurrence.kind === 'COMMITTED';
    if (isWork ? !options.shifts : !options.protectedTime) continue;
    const title = isWork
      ? options.shiftLabels
        ? occurrence.label || occurrence.patternName || 'Busy'
        : 'Busy'
      : 'Protected time';
    events.push({ uid: `block-${occurrence.patternId}-${occurrence.start.toISOString()}`, title, start: occurrence.start, end: occurrence.end });
  }
  if (options.tasks) {
    for (const item of items) {
      if (item.status !== 'OPEN' && item.status !== 'WAITING') continue;
      if (item.scheduledAt) {
        const start = new Date(item.scheduledAt);
        events.push({ uid: `item-${item.id}`, title: item.title, start, end: item.endsAt && new Date(item.endsAt) > start ? new Date(item.endsAt) : new Date(start.getTime() + ITEM_MINUTES * 60_000) });
      } else if (item.plannedFor) {
        events.push({ uid: `item-${item.id}`, title: item.title, date: item.plannedFor });
      }
    }
  }
  return events;
}
