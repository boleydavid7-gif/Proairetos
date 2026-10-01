import { requestToPromise, stores, transactionDone } from '../storage/indexeddb/database';
import type { LocalRecord, LocalSyncStore, SyncCollection, SyncStateStore } from './types';

type Db = Promise<IDBDatabase>;

async function tx(db: Db, name: string, mode: IDBTransactionMode) {
  const transaction = (await db).transaction(name, mode);
  return { transaction, store: transaction.objectStore(name) };
}

/** IndexedDB access beneath the repositories. Item events keep their write-order key. */
export function createIndexedDbLocalSyncStore(db: Db): LocalSyncStore {
  return {
    async list(collection) {
      const { store } = await tx(db, collection, 'readonly');
      const records = await requestToPromise(store.getAll());
      return (records as (LocalRecord & { seq?: number })[]).map(({ seq: _seq, ...record }) => record as LocalRecord);
    },

    async put(collection, record) {
      const { transaction, store } = await tx(db, collection, 'readwrite');
      if (collection === stores.itemEvents) {
        const existing = await requestToPromise(store.index('id').getKey(record.id));
        store.put(existing === undefined ? record : { ...record, seq: existing });
      } else {
        store.put(record);
      }
      await transactionDone(transaction);
    },

    async remove(collection, id) {
      const { transaction, store } = await tx(db, collection, 'readwrite');
      if (collection === stores.itemEvents) {
        const existing = await requestToPromise(store.index('id').getKey(id));
        if (existing !== undefined) store.delete(existing);
      } else {
        store.delete(id);
      }
      await transactionDone(transaction);
    },
  };
}

export function createIndexedDbSyncStateStore(db: Db): SyncStateStore {
  return {
    async fingerprints() {
      const { store } = await tx(db, stores.syncState, 'readonly');
      const rows = (await requestToPromise(store.getAll())) as { key: string; fingerprint: string }[];
      return new Map(rows.map((row) => [row.key, row.fingerprint]));
    },
    async setFingerprint(key, fingerprint) {
      const { transaction, store } = await tx(db, stores.syncState, 'readwrite');
      store.put({ key, fingerprint });
      await transactionDone(transaction);
    },
    async removeFingerprint(key) {
      const { transaction, store } = await tx(db, stores.syncState, 'readwrite');
      store.delete(key);
      await transactionDone(transaction);
    },
    async getMeta<T>(name: string) {
      const { store } = await tx(db, stores.syncMeta, 'readonly');
      const row = (await requestToPromise(store.get(name))) as { value: T } | undefined;
      return row?.value;
    },
    async setMeta(name, value) {
      const { transaction, store } = await tx(db, stores.syncMeta, 'readwrite');
      store.put({ name, value });
      await transactionDone(transaction);
    },
    async clear() {
      for (const name of [stores.syncState, stores.syncMeta]) {
        const { transaction, store } = await tx(db, name, 'readwrite');
        store.clear();
        await transactionDone(transaction);
      }
    },
  };
}

/** In-memory versions, for tests and for browsers that block storage. */
export function createMemoryLocalSyncStore(initial: Partial<Record<SyncCollection, LocalRecord[]>> = {}) {
  const data = new Map<SyncCollection, Map<string, LocalRecord>>();
  const bucket = (collection: SyncCollection) => {
    if (!data.has(collection)) data.set(collection, new Map());
    return data.get(collection)!;
  };
  for (const [collection, records] of Object.entries(initial)) {
    for (const record of records ?? []) bucket(collection as SyncCollection).set(record.id, structuredClone(record));
  }
  const store: LocalSyncStore = {
    async list(collection) {
      return [...bucket(collection).values()].map((r) => structuredClone(r));
    },
    async put(collection, record) {
      bucket(collection).set(record.id, structuredClone(record));
    },
    async remove(collection, id) {
      bucket(collection).delete(id);
    },
  };
  return store;
}

export function createMemorySyncStateStore(): SyncStateStore {
  let prints = new Map<string, string>();
  let meta = new Map<string, unknown>();
  return {
    async fingerprints() {
      return new Map(prints);
    },
    async setFingerprint(key, fingerprint) {
      prints.set(key, fingerprint);
    },
    async removeFingerprint(key) {
      prints.delete(key);
    },
    async getMeta<T>(name: string) {
      return meta.get(name) as T | undefined;
    },
    async setMeta(name, value) {
      meta.set(name, value);
    },
    async clear() {
      prints = new Map();
      meta = new Map();
    },
  };
}
