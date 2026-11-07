/*
 * Records kept one per browser-storage key (`collection` in shell.tsx) say here when one changes in this tab, and other
 * tabs say it through the browser's `storage` event. A provider's cached result watches the prefix it reads, so it needs
 * none of the owning app's code. Sync changes are reported separately (`onChangedCollections`).
 */
const watchers = new Map<string, Set<() => void>>();

export function announceLocal(prefix: string): void {
  for (const [watched, listeners] of watchers) {
    if (watched.startsWith(prefix) || prefix.startsWith(watched)) listeners.forEach((listener) => listener());
  }
}

export function watchLocal(prefix: string, listener: () => void): () => void {
  const listeners = watchers.get(prefix) ?? new Set<() => void>();
  listeners.add(listener);
  watchers.set(prefix, listeners);
  const onStorage = (event: StorageEvent) => (event.key === null || event.key.startsWith(prefix)) && listener();
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}
