import type { LifeItem } from '../life-items/types';
import type { NowItemReason } from './types';

export const allowedNowReasons: NowItemReason[] = [
  'SCHEDULED',
  'IMPORTANT',
  'CHECK_BACK',
  'UNSORTED',
];

export function canAppearInNow(reason: NowItemReason): boolean {
  return allowedNowReasons.includes(reason);
}

/**
 * Lists why an item appears in Now, based only on what the person set.
 * Reasons are returned in a fixed order and never ranked against other items.
 */
export function nowReasonsFor(item: LifeItem): NowItemReason[] {
  if (item.status === 'DONE' || item.status === 'LET_GO') {
    return [];
  }

  const reasons: NowItemReason[] = [];

  if (item.scheduledAt) reasons.push('SCHEDULED');
  if (item.important) reasons.push('IMPORTANT');
  if (item.status === 'WAITING' && item.checkBackAt) reasons.push('CHECK_BACK');
  if (item.type === null) reasons.push('UNSORTED');

  return reasons;
}

export function isVisibleInNow(item: LifeItem): boolean {
  return nowReasonsFor(item).length > 0;
}
