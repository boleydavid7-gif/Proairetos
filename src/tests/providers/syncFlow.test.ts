import { beforeAll, describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { searchProjections, type HostContext } from '../../core/providers';
import { createSyncEngine } from '../../data/sync/engine';
import { createKeys } from '../../data/sync/keys';
import { createMemoryLocalSyncStore, createMemorySyncStateStore } from '../../data/sync/localStores';
import type { LocalSyncStore, OutgoingRecord, RemoteRecord, RemoteStore, SyncCollection } from '../../data/sync/types';
import { syncedSetting } from '../../data/sync/deviceRecords';
import { hydrosSearch } from '../../hydros/providers/search';
import { oikonomiaSearch } from '../../oikonomia/providers/search';

/*
 * Two installs and a stand-in server. Whatever one install saves reaches the other as a sealed record and shows in
 * universal search there, from the other install's own copy. Nothing about it needs shared browser storage.
 */
const TODAY = '2026-11-05';

function fakeServer() {
  const rows = new Map<string, RemoteRecord>();
  let seq = 0;
  let down = false;
  const remote: RemoteStore = {
    async pull(afterSeq, limit) {
      if (down) throw new Error('offline');
      return [...rows.values()].filter((row) => row.seq > afterSeq).sort((a, b) => a.seq - b.seq).slice(0, limit);
    },
    async push(records: OutgoingRecord[]) {
      if (down) throw new Error('offline');
      for (const record of records) rows.set(`${record.collection}:${record.id}`, { ...record, seq: ++seq });
    },
  };
  return { remote, rows, offline: (value: boolean) => { down = value; } };
}

let key: CryptoKey;
beforeAll(async () => {
  key = (await createKeys('quiet river morning')).dataKey;
}, 30_000);

function install(remote: RemoteStore) {
  const local: LocalSyncStore = createMemoryLocalSyncStore();
  const changed: string[][] = [];
  const engine = createSyncEngine({ local, state: createMemorySyncStateStore(), remote, key, onChanged: (collections) => changed.push([...collections]) });
  const ctx = (extra: Partial<HostContext> = {}): HostContext => ({
    today: TODAY,
    now: new Date(`${TODAY}T12:00:00`),
    records: async <T,>(source: string) => (await local.list(source as SyncCollection)) as unknown as T[],
    setting: () => null,
    isUsable: () => true,
    enabled: () => true,
    ...extra,
  });
  return { local, engine, changed, ctx };
}

const bill = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, name, amountCents: 98765432, currency: 'USD', dueDate: '2026-11-10', frequency: 'monthly', autopay: false, reminderDays: 3,
  notes: 'CANARY-NOTE', payments: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...extra,
});
const titles = async (host: ReturnType<typeof install>, extra: Partial<HostContext> = {}) =>
  (await searchProjections([oikonomiaSearch], APPS, host.ctx(extra))).results.map((row) => row.title).sort();

describe('search across installs, through encrypted sync', () => {
  it('a bill saved on one install is found on another, with nothing but its name, date and status', async () => {
    const { remote, rows } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    await a.local.put('oikonomiaBills', bill('b1', 'Internet'));
    await a.engine.sync();
    expect(JSON.stringify([...rows.values()])).not.toContain('Internet');
    expect(await titles(b)).toEqual([]);
    await b.engine.sync();
    expect(await titles(b)).toEqual(['Internet']);
    expect(b.changed.flat()).toEqual(['oikonomiaBills']);
    const found = (await searchProjections([oikonomiaSearch], APPS, b.ctx())).results;
    expect(JSON.stringify(found)).not.toMatch(/CANARY|98765432|USD/);
  });

  it('an edit and a deletion reach the other install, and the result follows', async () => {
    const { remote } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    await a.local.put('oikonomiaBills', bill('b1', 'Internet'));
    await a.engine.sync();
    await b.engine.sync();
    await a.local.put('oikonomiaBills', bill('b1', 'Fiber internet'));
    await a.engine.sync();
    await b.engine.sync();
    expect(await titles(b)).toEqual(['Fiber internet']);
    await a.local.remove('oikonomiaBills', 'b1');
    await a.engine.sync();
    await b.engine.sync();
    expect(await titles(b)).toEqual([]);
    expect(b.changed.flat().every((name) => name === 'oikonomiaBills')).toBe(true);
  });

  it('search works with no connection: it reads what the install already holds', async () => {
    const server = fakeServer();
    const a = install(server.remote);
    const b = install(server.remote);
    await a.local.put('oikonomiaBills', bill('b1', 'Internet'));
    await a.engine.sync();
    await b.engine.sync();
    server.offline(true);
    await expect(b.engine.sync()).rejects.toThrow('offline');
    expect(await titles(b)).toEqual(['Internet']);
  });

  it('a bill edited on both installs shows this install’s own version (the sync engine’s rule)', async () => {
    const { remote } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    await a.local.put('oikonomiaBills', bill('b1', 'Internet'));
    await a.engine.sync();
    await b.engine.sync();
    await a.local.put('oikonomiaBills', bill('b1', 'Internet (A)'));
    await b.local.put('oikonomiaBills', bill('b1', 'Internet (B)'));
    await a.engine.sync();
    await b.engine.sync();
    expect(await titles(b)).toEqual(['Internet (B)']);
  });

  it('turning an app off removes its results at once, and turning it on brings them back', async () => {
    const { remote } = fakeServer();
    const a = install(remote);
    await a.local.put('oikonomiaBills', bill('b1', 'Internet'));
    expect(await titles(a)).toEqual(['Internet']);
    expect(await titles(a, { enabled: () => false })).toEqual([]);
    expect(await titles(a, { isUsable: () => false })).toEqual([]);
    expect(await titles(a)).toEqual(['Internet']);
    expect(syncedSetting('proairetos.providers')).toBe(true);
  });

  it('Hydros drinks cross installs too, and only the last 30 days are searchable', async () => {
    const { remote } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    const at = (daysAgo: number) => { const d = new Date(`${TODAY}T07:43:00`); d.setDate(d.getDate() - daysAgo); return d.toISOString(); };
    await a.local.put('hydrosDrinks', { id: 'd1', kind: 'tea', label: 'Hibiscus tea', amountOz: 12, caffeineMg: 31337, loggedAt: at(2), createdAt: at(2) });
    await a.local.put('hydrosDrinks', { id: 'd2', kind: 'tea', label: 'Old chai', amountOz: 12, loggedAt: at(45), createdAt: at(45) });
    await a.engine.sync();
    await b.engine.sync();
    const out = await searchProjections([hydrosSearch], APPS, b.ctx());
    const names = out.results.filter((row) => row.ref.kind === 'drink-name').map((row) => row.title);
    expect(names).toEqual(['Hibiscus tea']);
    expect(JSON.stringify(out.results)).not.toMatch(/31337|07:43|Old chai/);
  });
});
