/*
 * Photos of each plant over time, kept on this phone only in their own IndexedDB database, like Ktema's files:
 * not in backups or sync. Each is made small (1200 px on its long side, JPEG) before it is kept.
 */
import { useEffect, useState } from 'react';
import { readArchiveJson, readZip } from '../../app/family/downloadZip';

export type PlantPhoto = { id: string; plantId: string; date: string; type: string; data: ArrayBuffer };

const DB = 'phyton-photos';
const STORE = 'photos';
const SIDE = 1200;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' }).createIndex('plantId', 'plantId');
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

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

export const photosFor = (plantId: string) =>
  run<PlantPhoto[]>('readonly', (store) => store.index('plantId').getAll(plantId))
    .then((list) => list.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)))
    .catch(() => [] as PlantPhoto[]);

export async function putPhoto(photo: PlantPhoto): Promise<void> {
  await run('readwrite', (store) => store.put(photo));
  changed();
}

export async function removePhoto(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id)).catch(() => undefined);
  changed();
}

/** Restores a plant's photos from the archive saved on another phone. */
export async function importPhotos(file: Blob, plantId: string): Promise<number> {
  const files = await readZip(file);
  const manifest = readArchiveJson<{ app?: string; plantId?: string; photos?: { id?: string; date?: string; type?: string }[] }>(files, 'manifest.json');
  if (manifest.app !== 'phyton' || manifest.plantId !== plantId || !Array.isArray(manifest.photos)) throw new Error('This is not a Phyton photo archive for this plant.');
  let restored = 0;
  for (const info of manifest.photos) {
    if (!info.id || !info.date) continue;
    const path = Object.keys(files).find((each) => each.startsWith('photos/') && each.endsWith(`${info.id}.jpg`));
    if (!path) continue;
    const data = files[path];
    await putPhoto({ id: info.id, plantId, date: info.date, type: info.type || 'image/jpeg', data: data.slice().buffer as ArrayBuffer });
    restored += 1;
  }
  return restored;
}

/** A chosen image made small, as JPEG; for keeping and for identifying. */
export async function smallPhoto(file: Blob, side = SIDE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('That photo could not be read.');
  return blob;
}

/** A plant's photos with addresses for <img>, oldest first; follows additions and removals. */
export function usePhotos(plantId: string | undefined): { photo: PlantPhoto; url: string }[] {
  const [list, setList] = useState<{ photo: PlantPhoto; url: string }[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  useEffect(() => {
    if (!plantId) return;
    let live = true;
    let made: string[] = [];
    void photosFor(plantId).then((photos) => {
      if (!live) return;
      const next = photos.map((photo) => ({ photo, url: URL.createObjectURL(new Blob([photo.data], { type: photo.type })) }));
      made = next.map((each) => each.url);
      setList(next);
    });
    return () => {
      live = false;
      made.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [plantId, tick]);
  return list;
}

/** The newest photo of each plant, for the lists. */
export function useLatestPhoto(plantId: string): string | undefined {
  const list = usePhotos(plantId);
  return list[list.length - 1]?.url;
}
