import { occurrencesBetween } from '../../core/scheduling/patterns';
import type { ScheduleException, ScheduleOccurrence, SchedulePattern } from '../../core/scheduling/types';

/**
 * Reads the person's Proairetos schedule, on this device, to notice days
 * that follow a night of work. Only reads; never writes. If Proairetos was
 * never opened here, there is nothing to read and nothing is created.
 */
function openExisting(): Promise<IDBDatabase | undefined> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open('proairetos');
    } catch {
      resolve(undefined);
      return;
    }
    // Opening without a version creates the database if it is missing; undo that.
    request.onupgradeneeded = () => request.transaction?.abort();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
    request.onblocked = () => resolve(undefined);
  });
}

function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) {
      resolve([]);
      return;
    }
    const request = db.transaction(store, 'readonly').objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => resolve([]);
  });
}

export async function scheduleBetween(from: Date, to: Date): Promise<ScheduleOccurrence[]> {
  const db = await openExisting();
  if (!db) return [];
  try {
    const [patterns, exceptions] = await Promise.all([
      readAll<SchedulePattern>(db, 'schedulePatterns'),
      readAll<ScheduleException>(db, 'scheduleExceptions'),
    ]);
    return occurrencesBetween(patterns, exceptions, from, to);
  } catch {
    return [];
  } finally {
    db.close();
  }
}
