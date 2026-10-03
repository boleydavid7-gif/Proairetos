export const DB_NAME = 'proairetos';
// Version 1: lifeItems, itemEvents, reflections. Version 2: values, statements.
// Version 3: schedulePatterns, scheduleExceptions. Version 4: decisions.
// Version 5: syncState (fingerprints of synced records), syncMeta (cursor, device key).
// Version 6: attachments (photos and files kept with items, device only).
// Version 7: askesisWorkouts, askesisPlans (Askesis, the training app, served
// from the same address, keeps its records here so they sync with the account).
export const DB_VERSION = 7;

export const stores = {
  lifeItems: 'lifeItems',
  itemEvents: 'itemEvents',
  reflections: 'reflections',
  values: 'values',
  statements: 'statements',
  schedulePatterns: 'schedulePatterns',
  scheduleExceptions: 'scheduleExceptions',
  decisions: 'decisions',
  syncState: 'syncState',
  syncMeta: 'syncMeta',
  attachments: 'attachments',
  askesisWorkouts: 'askesisWorkouts',
  askesisPlans: 'askesisPlans',
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
      if (!db.objectStoreNames.contains(stores.schedulePatterns)) {
        db.createObjectStore(stores.schedulePatterns, { keyPath: 'id' }).createIndex('userId', 'userId');
      }
      if (!db.objectStoreNames.contains(stores.scheduleExceptions)) {
        db.createObjectStore(stores.scheduleExceptions, { keyPath: 'id' }).createIndex('userId', 'userId');
      }
      if (!db.objectStoreNames.contains(stores.decisions)) {
        db.createObjectStore(stores.decisions, { keyPath: 'id' }).createIndex('userId', 'userId');
      }
      if (!db.objectStoreNames.contains(stores.syncState)) {
        db.createObjectStore(stores.syncState, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(stores.syncMeta)) {
        db.createObjectStore(stores.syncMeta, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(stores.attachments)) {
        db.createObjectStore(stores.attachments, { keyPath: 'id' }).createIndex('userId', 'userId');
      }
      if (!db.objectStoreNames.contains(stores.askesisWorkouts)) {
        db.createObjectStore(stores.askesisWorkouts, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(stores.askesisPlans)) {
        db.createObjectStore(stores.askesisPlans, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Proairetos and Askesis share this database; a newer one opening in the other app
      // gets the way cleared, and this page reloads to pick up the new version.
      db.onversionchange = () => {
        db.close();
        if (typeof location !== 'undefined' && typeof document !== 'undefined' && document.visibilityState === 'visible') location.reload();
      };
      resolve(db);
    };
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
