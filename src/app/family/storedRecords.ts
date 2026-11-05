import { useMemo, useSyncExternalStore } from 'react';
import { subscribeAdded } from './added';
import { onRemoteChanges } from '../sync/syncController';

/*
 * Another app's records, read only from browser storage by their key prefix, so Proairetos's first load carries none of
 * that app's code. `useStoredRecords` re-reads when storage changes in this or another tab, when sync brings changes,
 * and when an app is added or removed.
 */

export function readRecords<T>(prefix: string): T[] {
  const out: T[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        out.push(JSON.parse(localStorage.getItem(key) ?? '') as T);
      } catch {
        // An unreadable record is passed over.
      }
    }
  } catch {
    // Storage blocked: nothing to show.
  }
  return out;
}

export function subscribeRecords(prefix: string, listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => (event.key === null || event.key.startsWith(prefix)) && listener();
  window.addEventListener('storage', onStorage);
  const offRemote = onRemoteChanges(listener);
  const offAdded = subscribeAdded(listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    offRemote();
    offAdded();
  };
}

export function useStoredRecords<T>(prefix: string, enabled: boolean): T[] {
  const raw = useSyncExternalStore(
    (listener) => subscribeRecords(prefix, listener),
    () => (enabled ? JSON.stringify(readRecords<T & { id?: string }>(prefix).sort((a, b) => String(a.id).localeCompare(String(b.id)))) : ''),
    () => '',
  );
  return useMemo(() => (raw ? (JSON.parse(raw) as T[]) : []), [raw]);
}
