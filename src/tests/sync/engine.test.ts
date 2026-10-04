import { IDBFactory } from 'fake-indexeddb';
import { createSyncEngine, fingerprint, stableStringify } from '../../data/sync/engine';
import { createKeys } from '../../data/sync/keys';
import {
  createIndexedDbLocalSyncStore,
  createIndexedDbSyncStateStore,
  createMemoryLocalSyncStore,
  createMemorySyncStateStore,
} from '../../data/sync/localStores';
import type { LocalSyncStore, OutgoingRecord, RemoteRecord, RemoteStore } from '../../data/sync/types';
import { createIndexedDbItemEventRepository, createIndexedDbLifeItemRepository } from '../../data/repositories/indexeddb/indexedDbRepositories';
import { openDatabase } from '../../data/storage/indexeddb/database';
import { newBudget } from '../../oikonomia/core/budget';

/** A stand-in for Supabase: assigns a sequence number on every write, like the real table. */
function fakeServer() {
  const rows = new Map<string, RemoteRecord>();
  let seq = 0;
  const remote: RemoteStore = {
    async pull(afterSeq, limit) {
      return [...rows.values()].filter((r) => r.seq > afterSeq).sort((a, b) => a.seq - b.seq).slice(0, limit);
    },
    async push(records: OutgoingRecord[]) {
      for (const record of records) rows.set(`${record.collection}:${record.id}`, { ...record, seq: ++seq });
    },
  };
  return { remote, rows };
}

let key: CryptoKey;
beforeAll(async () => {
  key = (await createKeys('quiet river morning')).dataKey;
}, 30_000);

function device(server: RemoteStore, local: LocalSyncStore = createMemoryLocalSyncStore()) {
  return { local, engine: createSyncEngine({ local, state: createMemorySyncStateStore(), remote: server, key }) };
}

const item = (id: string, title: string, extra = {}) => ({ id, userId: 'local', title, status: 'OPEN', ...extra });

describe('sync engine', () => {
  it('moves records from one device to another, sealed on the server', async () => {
    const { remote, rows } = fakeServer();
    const phone = device(remote);
    const laptop = device(remote);
    await phone.local.put('lifeItems', item('a', 'Call the clinic'));
    await phone.local.put('reflections', { id: 'r', userId: 'local', body: 'A private thought.' });

    expect(await phone.engine.sync()).toEqual({ pulled: 0, pushed: 2 });
    expect(JSON.stringify([...rows.values()])).not.toContain('private thought');

    expect((await laptop.engine.sync()).pulled).toBe(2);
    expect(await laptop.local.list('lifeItems')).toEqual([item('a', 'Call the clinic')]);
  });

  it('pushes nothing when nothing changed, and does not echo its own writes', async () => {
    const { remote } = fakeServer();
    const phone = device(remote);
    await phone.local.put('lifeItems', item('a', 'x'));
    await phone.engine.sync();
    expect(await phone.engine.sync()).toEqual({ pulled: 0, pushed: 0 });
  });

  it('carries edits and deletions both ways', async () => {
    const { remote } = fakeServer();
    const phone = device(remote);
    const laptop = device(remote);
    await phone.local.put('lifeItems', item('a', 'Draft'));
    await phone.local.put('lifeItems', item('b', 'Keep'));
    await phone.engine.sync();
    await laptop.engine.sync();

    await laptop.local.put('lifeItems', item('a', 'Edited on laptop'));
    await laptop.local.remove('lifeItems', 'b');
    await laptop.engine.sync();
    await phone.engine.sync();

    expect(await phone.local.list('lifeItems')).toEqual([item('a', 'Edited on laptop')]);
  });

  it('keeps this device’s unsynced edit when the same record changed elsewhere', async () => {
    const { remote } = fakeServer();
    const phone = device(remote);
    const laptop = device(remote);
    await phone.local.put('lifeItems', item('a', 'Original'));
    await phone.engine.sync();
    await laptop.engine.sync();

    await laptop.local.put('lifeItems', item('a', 'Laptop version'));
    await laptop.engine.sync();
    await phone.local.put('lifeItems', item('a', 'Phone version'));
    await phone.engine.sync();
    expect(await phone.local.list('lifeItems')).toEqual([item('a', 'Phone version')]);

    await laptop.engine.sync();
    expect(await laptop.local.list('lifeItems')).toEqual([item('a', 'Phone version')]);
  });

  it('merges data that existed on a device before it first synced', async () => {
    const { remote } = fakeServer();
    const phone = device(remote);
    const laptop = device(remote);
    await phone.local.put('lifeItems', item('a', 'From phone'));
    await laptop.local.put('lifeItems', item('b', 'From laptop'));
    await phone.engine.sync();
    await laptop.engine.sync();
    await phone.engine.sync();

    const titles = async (d: LocalSyncStore) => (await d.list('lifeItems')).map((r) => r.title).sort();
    expect(await titles(phone.local)).toEqual(['From laptop', 'From phone']);
    expect(await titles(laptop.local)).toEqual(['From laptop', 'From phone']);
  });

  it('pages through large pulls', async () => {
    const { remote } = fakeServer();
    const phone = device(remote);
    for (let i = 0; i < 1203; i++) await phone.local.put('itemEvents', { id: `e${i}`, itemId: 'a', kind: 'CREATED', timestamp: 't' });
    await phone.engine.sync();
    const laptop = device(remote);
    expect((await laptop.engine.sync()).pulled).toBe(1203);
  });

  it('fingerprints ignore key order and undefined fields', async () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: undefined } })).toBe('{"a":{"d":2},"b":1}');
    expect(await fingerprint({ a: 1, b: 2 })).toBe(await fingerprint({ b: 2, a: 1 }));
  });
});

describe('sync with real local storage', () => {
  it('carries monthly budgets between devices without exposing their contents on the server', async () => {
    const { remote, rows } = fakeServer();
    const phoneDb = openDatabase(new IDBFactory());
    const tabletDb = openDatabase(new IDBFactory());
    const phone = createIndexedDbLocalSyncStore(phoneDb);
    const tablet = createIndexedDbLocalSyncStore(tabletDb);
    const phoneEngine = createSyncEngine({ local: phone, state: createIndexedDbSyncStateStore(phoneDb), remote, key });
    const tabletEngine = createSyncEngine({ local: tablet, state: createIndexedDbSyncStateStore(tabletDb), remote, key });
    const budget = {
      ...newBudget('2026-10', 'USD', '2026-10-01T00:00:00.000Z'),
      totalCents: 250000,
      categoryLimits: { ...newBudget('2026-10', 'USD').categoryLimits, food: 45000 },
    };
    await phone.put('oikonomiaBudgets', budget);

    expect(await phoneEngine.sync()).toEqual({ pulled: 0, pushed: 1 });
    const sealed = rows.get('oikonomiaBudgets:2026-10');
    expect(sealed).toMatchObject({ collection: 'oikonomiaBudgets', id: '2026-10', deleted: false });
    expect(sealed?.iv).toBeTruthy();
    expect(sealed?.ciphertext).toBeTruthy();
    expect(JSON.stringify(sealed)).not.toContain('categoryLimits');
    expect(JSON.stringify(sealed)).not.toContain('totalCents');

    expect(await tabletEngine.sync()).toEqual({ pulled: 1, pushed: 0 });
    expect(await tablet.list('oikonomiaBudgets')).toEqual([budget]);
    const changed = { ...budget, categoryLimits: { ...budget.categoryLimits, food: 50000 }, updatedAt: '2026-10-02T00:00:00.000Z' };
    await tablet.put('oikonomiaBudgets', changed);
    await tabletEngine.sync();
    await phoneEngine.sync();
    expect(await phone.list('oikonomiaBudgets')).toEqual([changed]);
  });

  it('applies pulled records so the app’s repositories see them, events in order', async () => {
    const { remote } = fakeServer();
    const phone = device(remote);
    await phone.local.put('lifeItems', item('a', 'Call the clinic', { type: 'DO', important: false, source: 'CAPTURE', carried: false, createdAt: 'x', updatedAt: 'x' }));
    for (const id of ['e1', 'e2', 'e3']) await phone.local.put('itemEvents', { id, itemId: 'a', kind: 'CREATED', timestamp: '2026-10-01' });
    await phone.engine.sync();

    const db = openDatabase(new IDBFactory());
    const laptop = createSyncEngine({
      local: createIndexedDbLocalSyncStore(db),
      state: createIndexedDbSyncStateStore(db),
      remote,
      key,
    });
    await laptop.sync();

    expect((await createIndexedDbLifeItemRepository(db).list('local')).map((i) => i.title)).toEqual(['Call the clinic']);
    expect((await createIndexedDbItemEventRepository(db).listForItem('a')).map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    expect(await laptop.sync()).toEqual({ pulled: 0, pushed: 0 });
  });
});
