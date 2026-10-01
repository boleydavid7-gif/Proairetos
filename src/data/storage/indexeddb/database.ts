export const DB_NAME = 'proairetos';
// Version 1: lifeItems, itemEvents, reflections. Version 2: values, statements.
export const DB_VERSION = 2;

export const stores = {
  lifeItems: 'lifeItems',
  itemEvents: 'itemEvents',
  reflections: 'reflections',
  values: 'values',
  statements: 'statements',
} as const;

export type StoreName = (typeof stores)[keyof typeof stores];

/** Opens the on-device database, creating stores on first run. */
export function openDatabase(factory: IDBFactory = indexedDB, name = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(stores.lifeItems)) {
        db.createObjectStore(stores.lifeItems, { keyPath: 'id' }).createIndex('userId', 'userId');
      }
      if (!db.objectStoreNames.contains(stores.itemEvents)) {
        // Auto-increment key keeps history in the order it was written, even within one millisecond.
        const events = db.createObjectStore(stores.itemEvents, { keyPath: 'seq', autoIncrement: true });
        events.createIndex('id', 'id', { unique: true });
        events.createIndex('itemId', 'itemId');
      }
      if (!db.objectStoreNames.contains(stores.reflections)) {
        db.createObjectStore(stores.reflections, { keyPath: 'id' }).createIndex('userId', 'userId');
      }
      if (!db.objectStoreNames.contains(stores.values)) {
        db.createObjectStore(stores.values, { keyPath: 'id' }).createIndex('userId', 'userId');
      }
      if (!db.objectStoreNames.contains(stores.statements)) {
        db.createObjectStore(stores.statements, { keyPath: 'id' }).createIndex('userId', 'userId');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('The Proairetos database is open in another tab with an older version.'));
  });
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted.'));
  });
}
