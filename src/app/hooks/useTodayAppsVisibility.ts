import { useSyncExternalStore } from 'react';
import { subscribePreferences, todayAppsHiddenSnapshot } from '../../data/storage/preferences';
import { readHiddenTodayApps, type TodayApp } from '../../core/today/apps';

/** Live app-summary visibility; a change or synced preference is reflected immediately. */
export function useTodayAppsVisibility(): ReadonlySet<TodayApp> {
  const snapshot = useSyncExternalStore(subscribePreferences, todayAppsHiddenSnapshot);
  try {
    return new Set(readHiddenTodayApps(JSON.parse(snapshot)));
  } catch {
    return new Set();
  }
}
