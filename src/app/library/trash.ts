import { collection } from '../family/shell';
import { isLibraryTrashExpired } from '../../core/life-records/library';

export const LIBRARY_TRASH_RETENTION_DAYS = 30;

export interface LibraryTrashEntry {
  /** Stable Life Record key. This is a Reflect-level tombstone, not a source record ID. */
  id: string;
  trashedAt: string;
  /** Retained as a tombstone so a source record cannot silently reappear in Reflect. */
  deletedAt?: string;
}

/**
 * Recently Deleted is deliberately Library-owned. Moving an item here never
 * deletes or mutates the authoritative record in its companion app.
 */
export const libraryTrash = collection<LibraryTrashEntry>('proairetos.libraryTrash:');

export function moveToLibraryTrash(recordKey: string, trashedAt = new Date().toISOString()): void {
  const current = libraryTrash.get(recordKey);
  if (current?.deletedAt) return;
  libraryTrash.put({ id: recordKey, trashedAt });
}

export function restoreFromLibraryTrash(recordKey: string): boolean {
  const current = libraryTrash.get(recordKey);
  if (!current || current.deletedAt) return false;
  libraryTrash.remove(recordKey);
  return true;
}

export function permanentlyRemoveFromLibraryTrash(recordKey: string, deletedAt = new Date().toISOString()): void {
  const current = libraryTrash.get(recordKey);
  if (!current) return;
  libraryTrash.put({ ...current, deletedAt });
}

/** Expired rows become small tombstones rather than reappearing from their source app. */
export function expireLibraryTrash(entries: readonly LibraryTrashEntry[], now = Date.now()): void {
  for (const entry of entries) {
    if (entry.deletedAt) continue;
    if (!isLibraryTrashExpired(entry.trashedAt, now, LIBRARY_TRASH_RETENTION_DAYS)) continue;
    permanentlyRemoveFromLibraryTrash(entry.id, new Date(now).toISOString());
  }
}
