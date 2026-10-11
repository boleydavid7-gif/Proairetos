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
