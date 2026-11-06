// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { homeRows, type HostContext } from '../../core/providers';
import { createSyncEngine } from '../../data/sync/engine';
import { createKeys } from '../../data/sync/keys';
import { createMemoryLocalSyncStore, createMemorySyncStateStore } from '../../data/sync/localStores';
import type { LocalSyncStore, OutgoingRecord, RemoteRecord, RemoteStore } from '../../data/sync/types';

/*
 * Today's lines across two installs and a stand-in server. A record one install saves reaches the other as a sealed
 * settings record; the other install's Home derives its lines from its own copy. Excluded fields travel with the
 * record and never appear in a line. A removed or edited record follows, an app set aside draws nothing, and with no
 * connection the install still draws from what it holds.
 */
const TODAY = '2026-11-05';
const day = '2026-11-01T09:00:00.000Z';

function fakeServer() {
  const rows = new Map<string, RemoteRecord>();
  let seq = 0;
  const remote: RemoteStore = {
    async pull(afterSeq, limit) { return [...rows.values()].filter((row) => row.seq > afterSeq).sort((a, b) => a.seq - b.seq).slice(0, limit); },
    async push(records: OutgoingRecord[]) { for (const record of records) rows.set(`${record.collection}:${record.id}`, { ...record, seq: ++seq }); },
  };
  return { remote, rows };
}
let key: CryptoKey;
beforeAll(async () => { key = (await createKeys('quiet river morning')).dataKey; }, 30_000);
beforeEach(() => localStorage.clear());

function install(remote: RemoteStore) {
  const local: LocalSyncStore = createMemoryLocalSyncStore();
  const engine = createSyncEngine({ local, state: createMemorySyncStateStore(), remote, key });
  const ctx: HostContext = {
    today: TODAY, now: new Date(`${TODAY}T12:00:00`),
    records: async <T,>(source: string) => {
      if (!source.startsWith('local:')) return (await local.list(source as never)) as unknown as T[];
      const prefix = source.slice(6);
      return (await local.list('preferences')).filter((record) => record.id.startsWith(prefix)).map((record) => JSON.parse(String(record.value)) as T);
    },
    setting: () => null, isUsable: () => true, enabled: () => true,
    day: { today: TODAY, start: new Date(`${TODAY}T00:00:00`), end: new Date(`${TODAY}T23:59:59`) },
  } as HostContext;
  /** What the app reads from browser storage: this install's settings records. */
  const applyToStorage = async () => { for (const record of await local.list('preferences')) localStorage.setItem(record.id, String(record.value)); };
  return { local, engine, ctx, applyToStorage };
}
const setting = (id: string, value: unknown) => ({ id, value: JSON.stringify(value) });
const chore = (name: string) => ({ id: 'c1', name, room: 'Kitchen', note: 'CANARY-NOTE', repeat: { kind: 'days', every: 1 }, start: '2026-11-04', history: [], createdAt: day });

async function lines(host: ReturnType<typeof install>, enabled: (app: string) => boolean = () => true) {
  const { ergonHome } = await import('../../ergon/providers/home');
  const out = await homeRows([ergonHome], APPS, { ...host.ctx, enabled } as HostContext);
  expect(out.rejected).toEqual([]);
  return out.rows;
}

describe('Home across installs', () => {
  it('a chore saved on one install is a line on the other, without its note, and an edit and a removal follow', async () => {
    const { remote, rows } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    await a.local.put('preferences', setting('ergon:chore:c1', chore('Wipe counters')));
    await a.engine.sync();
    expect(JSON.stringify([...rows.values()])).not.toMatch(/Wipe|CANARY/);
    await b.engine.sync();
    await b.applyToStorage();
    const first = await lines(b);
    expect(first.map((row) => row.title)).toEqual(['Wipe counters']);
    expect(JSON.stringify(first)).not.toContain('CANARY');

    await a.local.put('preferences', setting('ergon:chore:c1', chore('Wipe the counters')));
    await a.engine.sync();
    await b.engine.sync();
    await b.applyToStorage();
    expect((await lines(b)).map((row) => row.title)).toEqual(['Wipe the counters']);

    await a.local.remove('preferences', 'ergon:chore:c1');
    await a.engine.sync();
    await b.engine.sync();
    localStorage.clear();
    await b.applyToStorage();
    expect(await lines(b)).toEqual([]);
  });

  it('an app set aside draws nothing on that install, and the other apps are unaffected', async () => {
    const { remote } = fakeServer();
    const a = install(remote);
    await a.local.put('preferences', setting('ergon:chore:c1', chore('Wipe counters')));
    await a.applyToStorage();
    expect(await lines(a, (app) => app !== 'ergon')).toEqual([]);
    expect((await lines(a)).length).toBe(1);
  });

  it('with no connection the install still draws its own copy', async () => {
    const { remote } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    await a.local.put('preferences', setting('ergon:chore:c1', chore('Wipe counters')));
    await a.engine.sync();
    await b.engine.sync();
    await b.applyToStorage();
    const down: RemoteStore = { pull: async () => { throw new Error('offline'); }, push: async () => { throw new Error('offline'); } };
    await expect(createSyncEngine({ local: b.local, state: createMemorySyncStateStore(), remote: down, key }).sync()).rejects.toThrow('offline');
    expect((await lines(b)).map((row) => row.title)).toEqual(['Wipe counters']);
  });
});
