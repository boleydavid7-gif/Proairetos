import { useSyncExternalStore } from 'react';
import { subscribePreferences, todayLayoutSnapshot } from '../../data/storage/preferences';
import { readLayout, type TodayLayout } from '../../core/today/layout';

/** Today's order and the sections turned off, read live (a change, an undo or a sync shows at once). */
export function useTodayLayout(): TodayLayout {
  const raw = useSyncExternalStore(subscribePreferences, todayLayoutSnapshot);
  let saved: unknown = null;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }
  return readLayout(saved);
}
