import { MAX_USER_VALUES } from './types';

export function canChooseMoreValues(currentCount: number): boolean {
  return currentCount < MAX_USER_VALUES;
}
