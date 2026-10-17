/*
 * A photo for a person, kept on this device only in its own IndexedDB database, like Ktema's files: not in backups
 * or sync. Photos are cropped square and made small before they are kept.
 */
import { useEffect, useState } from 'react';
import { readArchiveJson, readZip } from '../../app/family/downloadZip';

export type PersonPhoto = { personId: string; type: string; data: ArrayBuffer; at: string };

const DB = 'philia-photos';
const STORE = 'photos';
const SIDE = 480;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'personId' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = work(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const urls = new Map<string, string | null>();
const listeners = new Set<() => void>();
const changed = (personId: string) => {
  const url = urls.get(personId);
  if (url) URL.revokeObjectURL(url);
  urls.delete(personId);
  listeners.forEach((listener) => listener());
};

export const photoFor = (personId: string) => run<PersonPhoto | undefined>('readonly', (store) => store.get(personId)).catch(() => undefined);

export async function putPhoto(photo: PersonPhoto): Promise<void> {
  await run('readwrite', (store) => store.put(photo));
  changed(photo.personId);
}

export async function removePhoto(personId: string): Promise<void> {
  await run('readwrite', (store) => store.delete(personId)).catch(() => undefined);
  changed(personId);
}

/** Restores one person's photo from the archive saved on another phone. */
export async function importPhoto(file: Blob, personId: string): Promise<boolean> {
  const files = await readZip(file);
  const manifest = readArchiveJson<{ app?: string; personId?: string; photo?: { type?: string; at?: string } }>(files, 'manifest.json');
  if (manifest.app !== 'philia' || manifest.personId !== personId || !manifest.photo) throw new Error('This is not a Philia photo archive for this person.');
  const path = Object.keys(files).find((each) => each.startsWith('photo.'));
  if (!path) return false;
  const data = files[path];
  await putPhoto({ personId, type: manifest.photo.type || 'image/jpeg', data: data.slice().buffer as ArrayBuffer, at: manifest.photo.at || new Date().toISOString() });
  return true;
}

/** A chosen image, cropped to its middle square and made small, as JPEG. */
export async function squarePhoto(file: File): Promise<{ type: string; data: ArrayBuffer }> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(SIDE, side);
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  canvas.getContext('2d')?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  if (!blob) throw new Error('No image');
  return { type: 'image/jpeg', data: await blob.arrayBuffer() };
}

/** The photo's address for an <img>, or undefined while there is none. */
export function usePhoto(personId: string | undefined): string | undefined {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((tick) => tick + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  useEffect(() => {
    if (!personId || urls.has(personId)) return;
    let live = true;
    void photoFor(personId).then((photo) => {
      if (urls.has(personId)) return;
      urls.set(personId, photo ? URL.createObjectURL(new Blob([photo.data], { type: photo.type })) : null);
      if (live) setTick((tick) => tick + 1);
    });
    return () => {
      live = false;
    };
  });
  return personId ? urls.get(personId) ?? undefined : undefined;
}
