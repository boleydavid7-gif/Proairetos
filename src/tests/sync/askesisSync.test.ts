import { IDBFactory } from 'fake-indexeddb';
import { createSyncEngine } from '../../data/sync/engine';
import { createKeys } from '../../data/sync/keys';
import { createMemoryLocalSyncStore, createMemorySyncStateStore } from '../../data/sync/localStores';
import type { OutgoingRecord, RemoteRecord, RemoteStore } from '../../data/sync/types';
import { DB_VERSION, openDatabase } from '../../data/storage/indexeddb/database';

/** A server that refuses some collections, like one without the Askesis migration. */
function server(refuse: string[] = []) {
  const rows = new Map<string, RemoteRecord>();
  let seq = 0;
  const remote: RemoteStore = {
    async pull(afterSeq, limit) {
      return [...rows.values()].filter((r) => r.seq > afterSeq).sort((a, b) => a.seq - b.seq).slice(0, limit);
    },
    async push(records: OutgoingRecord[]) {
      if (records.some((record) => refuse.includes(record.collection))) throw new Error('violates check constraint');
      for (const record of records) rows.set(`${record.collection}:${record.id}`, { ...record, seq: ++seq });
    },
  };
  return { remote, rows, accept: () => refuse.splice(0) };
}

let key: CryptoKey;
beforeAll(async () => {
  key = (await createKeys('quiet river morning')).dataKey;
}, 30_000);

describe('Askesis records sync with the Proairetos account', () => {
  it('carries workouts and the plan to another device', async () => {
    const { remote } = server();
    const phone = createMemoryLocalSyncStore();
    const tablet = createMemoryLocalSyncStore();
    await phone.put('askesisWorkouts', { id: 'w1', date: '2026-10-03', activity: 'run', seconds: 1500 });
    await phone.put('askesisPlans', { id: 'current', level: 'beginner', week: 2 });
    await createSyncEngine({ local: phone, state: createMemorySyncStateStore(), remote, key }).sync();
    await createSyncEngine({ local: tablet, state: createMemorySyncStateStore(), remote, key }).sync();
    expect(await tablet.list('askesisWorkouts')).toEqual([{ id: 'w1', date: '2026-10-03', activity: 'run', seconds: 1500 }]);
    expect((await tablet.list('askesisPlans'))[0]).toMatchObject({ level: 'beginner', week: 2 });
  });

  it('holds them, without stopping Proairetos sync, until the server accepts them', async () => {
    const { remote, rows, accept } = server(['askesisWorkouts', 'askesisPlans']);
    const phone = createMemoryLocalSyncStore();
    const engine = createSyncEngine({ local: phone, state: createMemorySyncStateStore(), remote, key });
    await phone.put('lifeItems', { id: 'a', userId: 'local', title: 'Call the clinic' });
    await phone.put('askesisWorkouts', { id: 'w1', date: '2026-10-03', activity: 'run' });

    expect(await engine.sync()).toEqual({ pulled: 0, pushed: 1, held: 1 });
    expect([...rows.keys()]).toEqual(['lifeItems:a']);

    accept();
    expect(await engine.sync()).toEqual({ pulled: 0, pushed: 1 });
    expect([...rows.keys()].sort()).toEqual(['askesisWorkouts:w1', 'lifeItems:a']);
  });

  it('carries monthly Oikonomia plans with the family records', async () => {
    const { remote } = server();
    const phone = createMemoryLocalSyncStore();
    const tablet = createMemoryLocalSyncStore();
    await phone.put('oikonomiaBudgets', { id: '2026-10', month: '2026-10', currency: 'USD', totalCents: 250000, categoryLimits: { food: 70000 } });
    await createSyncEngine({ local: phone, state: createMemorySyncStateStore(), remote, key }).sync();
    await createSyncEngine({ local: tablet, state: createMemorySyncStateStore(), remote, key }).sync();
    expect(await tablet.list('oikonomiaBudgets')).toEqual([{ id: '2026-10', month: '2026-10', currency: 'USD', totalCents: 250000, categoryLimits: { food: 70000 } }]);
  });
});

describe('the shared database', () => {
  it('upgrades a version 6 database with the Askesis stores, keeping what was there', async () => {
    const factory = new IDBFactory();
    const v6 = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open('proairetos', 6);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('lifeItems', { keyPath: 'id' }).createIndex('userId', 'userId');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve) => {
      const transaction = v6.transaction('lifeItems', 'readwrite');
      transaction.objectStore('lifeItems').put({ id: 'kept', userId: 'u' });
      transaction.oncomplete = () => resolve();
    });
    v6.close();

    const db = await openDatabase(factory);
    expect(db.version).toBe(DB_VERSION);
    expect([...db.objectStoreNames]).toEqual(expect.arrayContaining(['askesisWorkouts', 'askesisPlans', 'lifeItems']));
    const kept = await new Promise((resolve) => {
      const request = db.transaction('lifeItems', 'readonly').objectStore('lifeItems').get('kept');
      request.onsuccess = () => resolve(request.result);
    });
    expect(kept).toEqual({ id: 'kept', userId: 'u' });
  });
});
