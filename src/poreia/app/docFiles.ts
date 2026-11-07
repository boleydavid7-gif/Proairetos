/*
 * Photos of travel documents (a boarding pass, a passport page), kept on this device only in their own IndexedDB
 * database: not in backups, sync or a shared trip. The details live on the document record.
 */

export type DocFile = { id: string; docId: string; name: string; type: string; data: ArrayBuffer; at: string };

const DB = 'poreia-files';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('docId', 'docId');
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

export const filesFor = (docId: string) => run<DocFile[]>('readonly', (store) => store.index('docId').getAll(docId)).catch(() => [] as DocFile[]);
export const putFile = (file: DocFile) => run('readwrite', (store) => store.put(file)).then(() => undefined);
export const removeFile = (id: string) => run('readwrite', (store) => store.delete(id)).then(() => undefined);
