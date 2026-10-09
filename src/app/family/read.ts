import { useEffect, useState } from 'react';
import { stores } from '../../data/storage/indexeddb/database';
import { deviceDatabase } from '../services';
import { onRemoteChanges } from '../sync/syncController';

/**
 * The other apps keep their records in this same database. Proairetos only reads them, never writes:
 * a few quiet facts on Today, and a way to find them in search.
 */
export async function readStore<T>(name: keyof typeof stores): Promise<T[]> {
  const db = await deviceDatabase;
  const store = stores[name];
  if (!db || !db.objectStoreNames.contains(store)) return [];
  return new Promise((resolve) => {
    const request = db.transaction(store, 'readonly').objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => resolve([]);
  });
}

/** A store's records, loaded now, again when sync brings changes, and when the app comes back into view. */
export function useStore<T>(name: keyof typeof stores, enabled = true): T[] {
  const [records, setRecords] = useState<T[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const load = () => void readStore<T>(name).then((next) => live && setRecords(next));
    load();
    const off = onRemoteChanges(load);
    const onShow = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      live = false;
      off();
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [name, enabled]);
  return records;
}
