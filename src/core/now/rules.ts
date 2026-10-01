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
