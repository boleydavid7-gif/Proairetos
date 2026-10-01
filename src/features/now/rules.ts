import type { NowSource } from './types';

export const allowedNowSources: readonly NowSource[] = [
  'scheduled',
  'important',
  'check_back',
  'unsorted',
];

export function canAppearInNow(source: NowSource): boolean {
  return allowedNowSources.includes(source);
}
