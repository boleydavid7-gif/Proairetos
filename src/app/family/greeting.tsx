import { useEffect, useSyncExternalStore } from 'react';
import { displayName, notifyPreferences, subscribePreferences } from '../../data/storage/preferences';

/** The time of day in words, the same in every app. */
export function greetingWords(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Good morning, Ada": the name set in Proairetos, in every app, kept up to date while the app is open. */
export function Greeting({ now }: { now?: Date }) {
  const name = useSyncExternalStore(subscribePreferences, displayName, displayName);
  useEffect(() => {
    // A name changed in another open app (same browser storage) arrives here too.
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'proairetos.displayName') notifyPreferences();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const words = greetingWords(now);
  return <>{name ? `${words}, ${name}` : words}</>;
}
