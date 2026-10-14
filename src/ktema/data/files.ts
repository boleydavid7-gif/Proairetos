import { readArchiveJson, readZip } from '../../app/family/downloadZip';

/*
 * Photos and files for things (a receipt, the rating plate, a manual as PDF), kept on this phone only, in their own
 * IndexedDB database, like Theoria's books: not in backups or sync, which carry the details instead.
 */

export type KtemaFile = { id: string; thingId: string; name: string; type: string; data: ArrayBuffer; at: string };

const DB = 'ktema-files';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('thingId', 'thingId');
    };
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

export const filesFor = (thingId: string) => run<KtemaFile[]>('readonly', (store) => store.index('thingId').getAll(thingId)).catch(() => [] as KtemaFile[]);
export const putFile = (file: KtemaFile) => run('readwrite', (store) => store.put(file)).then(() => undefined);
export const removeFile = (id: string) => run('readwrite', (store) => store.delete(id)).then(() => undefined);

/** Restores files from the archive saved for one thing. */
export async function importFiles(file: Blob, thingId: string): Promise<number> {
  const files = await readZip(file);
  const manifest = readArchiveJson<{ app?: string; thingId?: string; files?: { id?: string; name?: string; type?: string; at?: string }[] }>(files, 'manifest.json');
  if (manifest.app !== 'ktema' || manifest.thingId !== thingId || !Array.isArray(manifest.files)) throw new Error('This is not a Ktema files archive for this thing.');
  let restored = 0;
  for (const info of manifest.files) {
    if (!info.id || !info.name) continue;
    const path = Object.keys(files).find((each) => each.startsWith('files/') && each.endsWith(`-${info.id}`));
    if (!path) continue;
    const data = files[path];
    await putFile({ id: info.id, thingId, name: info.name, type: info.type || 'application/octet-stream', data: data.slice().buffer as ArrayBuffer, at: info.at || new Date().toISOString() });
    restored += 1;
  }
  return restored;
}
