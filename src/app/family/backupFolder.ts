import { useEffect, useState } from 'react';

/*
 * A backup folder the person chooses on their computer or Android phone (File System Access: Chrome and Edge; not
 * Safari or Firefox, where the option does not show). Backup files and daily copies are written there as well as
 * kept in the browser, and Theoria copies its books there, so a cleared browser or a lost phone loses nothing the
 * folder holds (a synced folder such as Drive or OneDrive carries it further). The folder's handle stays on this
 * device in IndexedDB `proairetos-folder`; nothing about it syncs.
 */

type Permission = 'granted' | 'denied' | 'prompt';
type Handle = FileSystemDirectoryHandle & {
  queryPermission?: (options: { mode: 'readwrite' }) => Promise<Permission>;
  requestPermission?: (options: { mode: 'readwrite' }) => Promise<Permission>;
};
type Picker = (options?: { id?: string; mode?: 'readwrite'; startIn?: string }) => Promise<Handle>;

const DB = 'proairetos-folder';
const STORE = 'handles';
const KEY = 'backup';
const listeners = new Set<() => void>();

export function folderSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as unknown as { showDirectoryPicker?: Picker }).showDirectoryPicker === 'function';
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** A kept folder by its key: `backup` (every app), `theoria-library` (Theoria's library folder). */
export async function storedFolder(key = KEY): Promise<Handle | undefined> {
  if (!folderSupported()) return undefined;
  return run<Handle | undefined>('readonly', (store) => store.get(key)).catch(() => undefined);
}
export const backupFolder = () => storedFolder(KEY);

/** Opens the folder picker (from a tap) and keeps the choice under its key. */
export async function chooseFolder(key = KEY, mode: 'read' | 'readwrite' = 'readwrite'): Promise<string | undefined> {
  const picker = (window as unknown as { showDirectoryPicker?: (options?: { id?: string; mode?: 'read' | 'readwrite'; startIn?: string }) => Promise<Handle> }).showDirectoryPicker;
  if (!picker) return undefined;
  const handle = await picker({ id: `proairetos-${key}`, mode, startIn: 'documents' });
  await run('readwrite', (store) => store.put(handle, key));
  listeners.forEach((listener) => listener());
  return handle.name;
}
export const chooseBackupFolder = () => chooseFolder(KEY);

export async function forgetFolder(key = KEY): Promise<void> {
  await run('readwrite', (store) => store.delete(key)).catch(() => undefined);
  listeners.forEach((listener) => listener());
}
export const forgetBackupFolder = () => forgetFolder(KEY);

/**
 * A kept folder, if the browser allows it now. `ask` (only from a tap) asks again when the browser has forgotten;
 * without it, a folder whose permission lapsed is skipped quietly.
 */
export async function allowedFolder(key = KEY, mode: 'read' | 'readwrite' = 'readwrite', ask = false): Promise<Handle | undefined> {
  const handle = await storedFolder(key);
  if (!handle) return undefined;
  const state = (await handle.queryPermission?.({ mode: mode as 'readwrite' }).catch(() => 'prompt' as Permission)) ?? 'granted';
  if (state === 'granted') return handle;
  if (!ask || !handle.requestPermission) return undefined;
  return (await handle.requestPermission({ mode: mode as 'readwrite' }).catch(() => 'denied' as Permission)) === 'granted' ? handle : undefined;
}
export const writableFolder = (ask = false) => allowedFolder(KEY, 'readwrite', ask);

/** A name safe on every system: no slashes, colons or other reserved marks, at most 120 characters. */
export function safeName(name: string): string {
  const cleaned = [...name].map((char) => (char.charCodeAt(0) < 32 ? ' ' : char)).join('').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '');
  return (cleaned || 'Untitled').slice(0, 120);
}

/** Writes one file into the folder (or a subfolder). Leaves a file of the same name and size alone when asked. */
export async function writeToFolder(folder: FileSystemDirectoryHandle, name: string, blob: Blob, options: { sub?: string; keepSame?: boolean } = {}): Promise<boolean> {
  const place = options.sub ? await folder.getDirectoryHandle(safeName(options.sub), { create: true }) : folder;
  const fileName = safeName(name);
  if (options.keepSame) {
    const existing = await place.getFileHandle(fileName).then((handle) => handle.getFile()).catch(() => undefined);
    if (existing && existing.size === blob.size) return false;
  }
  const handle = await place.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
}

/** The chosen folder's name, for showing; follows a change made on this page. */
export function useBackupFolder(key = KEY): { name?: string; supported: boolean; refresh: () => void } {
  const [name, setName] = useState<string>();
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    let live = true;
    void storedFolder(key).then((handle) => live && setName(handle?.name));
    const listener = () => setTurn((value) => value + 1);
    listeners.add(listener);
    return () => {
      live = false;
      listeners.delete(listener);
    };
  }, [turn, key]);
  return { name, supported: folderSupported(), refresh: () => setTurn((value) => value + 1) };
}
