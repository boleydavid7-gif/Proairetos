import { useSyncExternalStore } from 'react';
import { subscribePreferences, todayAppsHiddenSnapshot, todayAppsHidden } from '../../data/storage/preferences';
import type { TodayApp } from '../../core/today/apps';

/** Live app-summary visibility; a change or synced preference is reflected immediately. */
export function useTodayAppsVisibility(): ReadonlySet<TodayApp> {
  const snapshot = useSyncExternalStore(subscribePreferences, todayAppsHiddenSnapshot);
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    return new Set(todayAppsHidden().filter((app): app is TodayApp => typeof app === 'string')) as ReadonlySet<TodayApp>;
  } catch {
    return new Set();
  }
}
