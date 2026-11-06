// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { searchProjections, type HostContext, type Provider } from '../../core/providers';
import { createSyncEngine } from '../../data/sync/engine';
import { createKeys } from '../../data/sync/keys';
import { createMemoryLocalSyncStore, createMemorySyncStateStore } from '../../data/sync/localStores';
import type { LocalSyncStore, OutgoingRecord, RemoteRecord, RemoteStore, SyncCollection } from '../../data/sync/types';
import { syncedSetting } from '../../data/sync/deviceRecords';

/*
 * Every app’s search, across two installs and a stand-in server. What one install saves reaches the other as a sealed
 * record, and the other finds it through the provider from its own copy: collections for Soma, Theoria and Askesis, and
 * settings records (one per storage key) for the apps that keep records in browser storage. Excluded fields travel with
 * the record, as they must, and are never in what search holds.
 */
const TODAY = '2026-11-05';
const day = '2026-11-01T09:00:00.000Z';

function fakeServer() {
  const rows = new Map<string, RemoteRecord>();
  let seq = 0;
  const remote: RemoteStore = {
    async pull(afterSeq, limit) {
      return [...rows.values()].filter((row) => row.seq > afterSeq).sort((a, b) => a.seq - b.seq).slice(0, limit);
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
beforeEach(() => localStorage.clear());

function install(remote: RemoteStore) {
  const local: LocalSyncStore = createMemoryLocalSyncStore();
  const engine = createSyncEngine({ local, state: createMemorySyncStateStore(), remote, key });
  const ctx: HostContext = {
    today: TODAY,
    now: new Date(`${TODAY}T12:00:00`),
    records: async <T,>(source: string) => {
      if (!source.startsWith('local:')) return (await local.list(source as SyncCollection)) as unknown as T[];
      const prefix = source.slice(6);
      return (await local.list('preferences')).filter((record) => record.id.startsWith(prefix)).map((record) => JSON.parse(String(record.value)) as T);
    },
    setting: () => null,
    isUsable: () => true,
    enabled: () => true,
  };
  /** What the app itself reads from browser storage: this install's settings records, as `withDeviceRecords` applies them. */
  const applyToStorage = async () => {
    for (const record of await local.list('preferences')) localStorage.setItem(record.id, String(record.value));
  };
  return { local, engine, ctx, applyToStorage };
}
const titles = async (provider: Provider<'search'>, host: ReturnType<typeof install>) => {
  const out = await searchProjections([provider], APPS, host.ctx);
  expect(out.rejected).toEqual([]);
  return { rows: out.results, titles: out.results.map((row) => row.title).sort() };
};
const setting = (key: string, value: unknown) => ({ id: key, value: JSON.stringify(value) });

describe('search across installs for every app', () => {
  it('a collection record (Soma, Theoria, Askesis) saved on one install is found on the other, minus excluded fields', async () => {
    const { somaSearch } = await import('../../soma/providers/search');
    const { theoriaSearch } = await import('../../theoria/providers/search');
    const { askesisSearch } = await import('../../askesis/providers/search');
    const { remote, rows } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    await a.local.put('somaRecipes', { id: 'r1', title: 'Lentil soup', ingredients: ['lentils'], notes: 'Add lemon', tags: ['soup'], createdAt: day, nutritionCanary: 'CANARY-NUTRITION' });
    await a.local.put('theoriaBooks', { id: 'bk1', title: 'Meditations', author: 'Marcus Aurelius', highlights: [], notes: [], contentPreview: 'CANARY-TEXT', updatedAt: day });
    await a.local.put('askesisWorkouts', { id: 'e1', activity: 'run', date: '2026-10-20', notes: 'Felt easy', avgHr: 987, createdAt: day });
    await a.engine.sync();
    expect(JSON.stringify([...rows.values()])).not.toMatch(/Lentil|Meditations|Felt easy/);
    expect((await titles(somaSearch, b)).titles).toEqual([]);
    await b.engine.sync();
    expect((await titles(somaSearch, b)).titles).toEqual(['Lentil soup']);
    expect((await titles(theoriaSearch, b)).titles).toEqual(['Meditations']);
    const run = await titles(askesisSearch, b);
    expect(run.titles).toEqual(['Run, Oct 20']);
    for (const result of [await titles(somaSearch, b), await titles(theoriaSearch, b), run]) expect(JSON.stringify(result.rows)).not.toMatch(/CANARY|987/);
  });

  it('a settings-record app (Philia, Ktema, Poreia, Dynamis) saved on one install is found on the other', async () => {
    const { philiaSearch } = await import('../../philia/providers/search');
    const { ktemaSearch } = await import('../../ktema/providers/search');
    const { poreiaSearch } = await import('../../poreia/providers/search');
    const { dynamisSearch } = await import('../../dynamis/providers/search');
    const { remote } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    await a.local.put('preferences', setting('philia:person:p1', { id: 'p1', name: 'Mara', relation: 'Sister', phone: 'CANARY-PHONE', notes: [], gifts: [{ id: 'g', text: 'Linen apron' }], times: [], createdAt: day }));
    await a.local.put('preferences', setting('ktema:thing:t1', { id: 't1', name: 'Dishwasher', serial: 'CANARY-SERIAL', createdAt: day }));
    await a.local.put('preferences', setting('poreia:booking:b1', { id: 'b1', tripId: 'tr', kind: 'stay', title: 'Hotel Alfama', confirmation: 'CANARY-CODE', createdAt: day, updatedAt: day }));
    await a.local.put('preferences', setting('dynamis:workout:w1', { id: 'w1', date: '2026-10-30', session: 'A', exercises: [], note: 'Felt strong', createdAt: day }));
    for (const prefix of ['philia:person:', 'ktema:thing:', 'poreia:booking:', 'dynamis:workout:']) expect(syncedSetting(`${prefix}x`), prefix).toBe(true);
    await a.engine.sync();
    await b.engine.sync();
    const found = [await titles(philiaSearch, b), await titles(ktemaSearch, b), await titles(poreiaSearch, b), await titles(dynamisSearch, b)];
    expect(found.map((each) => each.titles)).toEqual([['Mara'], ['Dishwasher'], ['Hotel Alfama'], ['Strength, Oct 30']]);
    expect(JSON.stringify(found.map((each) => each.rows))).not.toMatch(/CANARY/);
    // An edit and a deletion on the first install reach the second.
    await a.local.put('preferences', setting('philia:person:p1', { id: 'p1', name: 'Mara K', relation: 'Sister', notes: [], gifts: [], times: [], createdAt: day }));
    await a.local.remove('preferences', 'ktema:thing:t1');
    await a.engine.sync();
    await b.engine.sync();
    expect((await titles(philiaSearch, b)).titles).toEqual(['Mara K']);
    expect((await titles(ktemaSearch, b)).titles).toEqual([]);
  });

  it('household-aware apps (Ergon, Therapeia) are found on the other install once its storage holds the synced records', async () => {
    const { ergonSearch } = await import('../../ergon/providers/search');
    const { therapeiaSearch } = await import('../../therapeia/providers/search');
    const { remote } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    await a.local.put('preferences', setting('ergon:chore:c1', { id: 'c1', name: 'Wipe counters', room: 'Kitchen', note: 'CANARY-NOTE', history: [], createdAt: day }));
    await a.local.put('preferences', setting('therapeia:medicine:m1', { id: 'm1', name: 'Sertraline', dose: 'CANARY-DOSE', createdAt: day }));
    await a.engine.sync();
    await b.engine.sync();
    await b.applyToStorage();
    expect((await titles(ergonSearch, b)).titles).toEqual(['Wipe counters']);
    const medicine = await titles(therapeiaSearch, b);
    expect(medicine.titles).toEqual(['Sertraline']);
    expect(JSON.stringify(medicine.rows)).not.toContain('CANARY');
  });

  it('with no connection every app still searches its own copy', async () => {
    const { somaSearch } = await import('../../soma/providers/search');
    const { philiaSearch } = await import('../../philia/providers/search');
    const { remote } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    await a.local.put('somaRecipes', { id: 'r1', title: 'Lentil soup', ingredients: [], notes: '', tags: [], createdAt: day });
    await a.local.put('preferences', setting('philia:person:p1', { id: 'p1', name: 'Mara', notes: [], gifts: [], times: [], createdAt: day }));
    await a.engine.sync();
    await b.engine.sync();
    const down: RemoteStore = { pull: async () => { throw new Error('offline'); }, push: async () => { throw new Error('offline'); } };
    const offline = createSyncEngine({ local: b.local, state: createMemorySyncStateStore(), remote: down, key });
    await expect(offline.sync()).rejects.toThrow('offline');
    expect((await titles(somaSearch, b)).titles).toEqual(['Lentil soup']);
    expect((await titles(philiaSearch, b)).titles).toEqual(['Mara']);
  });

  it('turning one app off removes only its results', async () => {
    const { somaSearch } = await import('../../soma/providers/search');
    const { theoriaSearch } = await import('../../theoria/providers/search');
    const { remote } = fakeServer();
    const a = install(remote);
    await a.local.put('somaRecipes', { id: 'r1', title: 'Lentil soup', ingredients: [], notes: '', tags: [], createdAt: day });
    await a.local.put('theoriaBooks', { id: 'bk1', title: 'Meditations', author: '', highlights: [], notes: [], updatedAt: day });
    const only = (off: string): HostContext => ({ ...a.ctx, enabled: (app) => app !== off });
    const out = await searchProjections([somaSearch, theoriaSearch], APPS, only('soma'));
    expect(out.results.map((row) => row.title)).toEqual(['Meditations']);
  });
});
