import { useSyncExternalStore } from 'react';
import { subscribePreferences, todayHiddenSnapshot, type TodayPart } from '../../data/storage/preferences';

/** Which parts of Today the person keeps. Read live, so a change or an undo shows at once. */
export function useTodayParts(): (part: TodayPart) => boolean {
  const snapshot = useSyncExternalStore(subscribePreferences, todayHiddenSnapshot);
  const hidden = new Set(snapshot ? snapshot.split(',') : []);
  return (part) => !hidden.has(part);
}
