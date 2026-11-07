import { onRemoteChanges, syncSoon } from '../../app/sync/syncController';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';
import { makeBook, makeNotebook, normalizeBook, normalizeNotebook, type NewTheoriaBook, type NewTheoriaNotebook, type TheoriaBook, type TheoriaNotebook } from '../core/books';

export const USER_ID = 'local';
const memory = new Map<string, TheoriaBook>();
const notebookMemory = new Map<string, TheoriaNotebook>();
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

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>, storeName: string = stores.theoriaBooks): Promise<T> {
  return db().then((database) => {
    if (!database) throw new Error('No database');
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = work(transaction.objectStore(storeName));
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
  if (!database) return [...memory.values()].filter((book) => book.userId === USER_ID).map(normalizeBook);
  const records = await run('readonly', (store) => store.index('userId').getAll(USER_ID) as IDBRequest<TheoriaBook[]>);
  return records.map(normalizeBook);
}

export async function putBook(book: TheoriaBook): Promise<void> {
  const persisted = book.coverPath ? { ...book, coverUrl: undefined } : book;
  const database = await db();
  if (!database) memory.set(persisted.id, persisted);
  else await run('readwrite', (store) => store.put(persisted));
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

export async function listNotebooks(): Promise<TheoriaNotebook[]> {
  const database = await db();
  if (!database) return [...notebookMemory.values()].filter((notebook) => notebook.userId === USER_ID).map(normalizeNotebook);
  const records = await run('readonly', (store) => store.index('userId').getAll(USER_ID) as IDBRequest<TheoriaNotebook[]>, stores.theoriaNotebooks);
  return records.map(normalizeNotebook);
}

export async function putNotebook(notebook: TheoriaNotebook): Promise<void> {
  const database = await db();
  if (!database) notebookMemory.set(notebook.id, notebook);
  else await run('readwrite', (store) => store.put(notebook), stores.theoriaNotebooks);
  notify();
  syncSoon();
}

export async function addNotebook(input: NewTheoriaNotebook): Promise<TheoriaNotebook> {
  const notebook = makeNotebook(USER_ID, input);
  await putNotebook(notebook);
  return notebook;
}

export async function removeNotebook(id: string): Promise<void> {
  const database = await db();
  if (!database) notebookMemory.delete(id);
  else await run('readwrite', (store) => store.delete(id), stores.theoriaNotebooks);
  notify();
  syncSoon();
}

export async function startStore(): Promise<void> {
  if (started) return;
  started = true;
  onRemoteChanges(notify);
}
