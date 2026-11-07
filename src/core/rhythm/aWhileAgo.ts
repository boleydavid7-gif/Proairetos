import type { LifeItem } from '../life-items/types';

/** How old a concern is before it is shown again, quietly. */
export const A_WHILE_DAYS = 21;
/** After "still with me", how long before it is shown again. */
export const KEEP_QUIET_DAYS = 30;
export const A_WHILE_SHOWN = 3;

const DAY = 86_400_000;

/**
 * Concerns the person noted a while ago and has not closed, oldest first.
 * Shown back in their own words with no comment; most worries pass, and
 * seeing that is the whole point (impermanence). `kept` maps item ids to
 * when the person last chose to keep one.
 */
export function fromAWhileAgo(items: readonly LifeItem[], now: Date, kept: Readonly<Record<string, string>>): LifeItem[] {
  return items
    .filter((item) => item.status === 'OPEN' || item.status === 'WAITING')
    .filter((item) => item.captureKind === 'CONCERN')
    .filter((item) => now.getTime() - new Date(item.createdAt).getTime() >= A_WHILE_DAYS * DAY)
    .filter((item) => !kept[item.id] || now.getTime() - new Date(kept[item.id]).getTime() >= KEEP_QUIET_DAYS * DAY)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, A_WHILE_SHOWN);
}
