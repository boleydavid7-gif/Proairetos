import type { LifeItem } from '../life-items/types';
import { itemSpan, type Span } from './openTime';

export type Busy = Span & { title: string };
export type Overlap = { item: LifeItem; with: string; key: string };

/**
 * Timed items that now share their time with a commitment or a calendar
 * event, often because a schedule or a calendar changed. Stated as a fact;
 * nothing moves unless the person moves it.
 */
export function overlaps(items: readonly LifeItem[], busy: readonly Busy[], from: Date, until: Date): Overlap[] {
  const found: Overlap[] = [];
  for (const item of items) {
    if (item.status !== 'OPEN' && item.status !== 'WAITING') continue;
    if (!item.scheduledAt || item.repeat) continue;
    const span = itemSpan(item.scheduledAt, item.endsAt);
    if (span.end <= from || span.start >= until) continue;
    const clash = busy.find((block) => span.start < block.end && span.end > block.start);
    if (clash) found.push({ item, with: clash.title, key: `${item.id}@${item.scheduledAt}` });
  }
  return found;
}

/** The first open stretch at or after `after`, as somewhere it could go instead. */
export function nextOpen(stretches: readonly Span[], after: Date): Date | undefined {
  return stretches.find((stretch) => stretch.start >= after)?.start;
}
