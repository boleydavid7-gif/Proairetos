import { onRemoteChanges, syncSoon } from '../../app/sync/syncController';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';
import { makeBook, type NewTheoriaBook, type TheoriaBook } from '../core/books';

const USER_ID = 'local';
const memory = new Map<string, TheoriaBook>();
let opened: Promise<IDBDatabase | undefined> | undefined;
let version = 0;
let started = false;
const listeners = new Set<() => void>();

function db(): Promise<IDBDatabase | undefined> {
  opened ??= openDatabase().catch(() => undefined);
  return opened;
}

function notify(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then((database) => {
    if (!database) throw new Error('No database');
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(stores.theoriaBooks, mode);
      const request = work(transaction.objectStore(stores.theoriaBooks));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Theoria storage transaction was aborted.'));
    });
  });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function storeVersion(): number {
  return version;
}

export async function listBooks(): Promise<TheoriaBook[]> {
  const database = await db();
  if (!database) return [...memory.values()].filter((book) => book.userId === USER_ID);
  return run('readonly', (store) => store.index('userId').getAll(USER_ID) as IDBRequest<TheoriaBook[]>);
}

export async function putBook(book: TheoriaBook): Promise<void> {
  const database = await db();
  if (!database) memory.set(book.id, book);
  else await run('readwrite', (store) => store.put(book));
  notify();
  syncSoon();
}

export async function addBook(input: NewTheoriaBook): Promise<TheoriaBook> {
  const book = makeBook(USER_ID, input);
  await putBook(book);
  return book;
}

export async function removeBook(id: string): Promise<void> {
  const database = await db();
  if (!database) memory.delete(id);
  else await run('readwrite', (store) => store.delete(id));
  notify();
  syncSoon();
}

export async function startStore(): Promise<void> {
  if (started) return;
  started = true;
  onRemoteChanges(notify);
}
