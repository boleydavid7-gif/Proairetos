// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { defaultNoticeSettings, type Notice } from '../../core/notify/notices';
import { createSyncEngine } from '../../data/sync/engine';
import { withDeviceRecords } from '../../data/sync/deviceRecords';
import { createKeys } from '../../data/sync/keys';
import { createMemoryLocalSyncStore, createMemorySyncStateStore } from '../../data/sync/localStores';
import type { OutgoingRecord, RemoteRecord, RemoteStore } from '../../data/sync/types';
import { now, seed, until } from './noticeFixtures';

/*
 * Notices across two installs and a stand-in server. The records the notices read are settings records that sync seals and
 * carries one by one into the other install's browser storage; the other install then works out the same notices from its own
 * copy, a removal follows, and nothing that a notice must not carry is in what the server holds in the clear.
 */
vi.mock('../../app/family/added', () => ({ isAdded: () => true, addedApps: () => [], useAddedApps: () => [] }));

function fakeServer() {
  const rows = new Map<string, RemoteRecord>();
  let seq = 0;
  const remote: RemoteStore = {
    async pull(afterSeq, limit) { return [...rows.values()].filter((row) => row.seq > afterSeq).sort((a, b) => a.seq - b.seq).slice(0, limit); },
    async push(records: OutgoingRecord[]) { for (const record of records) rows.set(`${record.collection}:${record.id}`, { ...record, seq: ++seq }); },
  };
  return { remote, rows };
}

/** A browser storage of its own, so two installs can hold different records in one test. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
  };
}

let key: CryptoKey;
beforeAll(async () => { key = (await createKeys('quiet river morning')).dataKey; }, 30_000);
afterEach(() => localStorage.clear());

const install = (remote: RemoteStore, storage: Storage) => ({
  storage,
  engine: createSyncEngine({ local: withDeviceRecords(createMemoryLocalSyncStore(), { storage }), state: createMemorySyncStateStore(), remote, key }),
});
type Install = ReturnType<typeof install>;

/** Works out the notices as this install would: its storage becomes the page's, then the apps are asked through the host. */
async function noticesOn(target: Install): Promise<string[]> {
  localStorage.clear();
  for (let index = 0; index < target.storage.length; index += 1) {
    const name = target.storage.key(index)!;
    localStorage.setItem(name, target.storage.getItem(name)!);
  }
  const { providerNotices } = await import('../../app/providers/notices');
  const found: Notice[] = await providerNotices(now, until, { ...defaultNoticeSettings, melete: true });
  return found.map((notice) => `${notice.kind} ${notice.key} ${notice.at.toISOString()} ${notice.title} | ${notice.body} | ${notice.open}`).sort();
}

const copyToStorage = (target: Storage) => {
  for (let index = 0; index < localStorage.length; index += 1) {
    const name = localStorage.key(index)!;
    target.setItem(name, localStorage.getItem(name)!);
  }
  localStorage.clear();
};

describe('notices across two installs', () => {
  it('are the same on an install that received the records as on the one that made them', async () => {
    const { remote, rows } = fakeServer();
    const a = install(remote, memoryStorage());
    const b = install(remote, memoryStorage());
    seed(false);
    copyToStorage(a.storage);
    const made = await noticesOn(a);
    expect(made.length).toBeGreaterThan(0);

    await a.engine.sync();
    await b.engine.sync();
    expect(await noticesOn(b)).toEqual(made);

    // What the server holds in the clear carries none of the words a notice says, nor any marked value.
    const plain = JSON.stringify([...rows.values()]);
    expect(plain).not.toMatch(/Mia|Lisbon|Take out bins|Biology|Kitchen pothos|Dishwasher|CANARY/);
  });

  it('follow a removal made on the other install', async () => {
    const { remote } = fakeServer();
    const a = install(remote, memoryStorage());
    const b = install(remote, memoryStorage());
    seed(false);
    copyToStorage(a.storage);
    await a.engine.sync();
    await b.engine.sync();
    expect((await noticesOn(b)).some((line) => line.includes('Biology'))).toBe(true);

    a.storage.removeItem('melete:subject:s1');
    a.storage.removeItem('melete:session:x1');
    await a.engine.sync();
    await b.engine.sync();
    const after = await noticesOn(b);
    expect(after.some((line) => line.includes('Biology'))).toBe(false);
    expect(after.some((line) => line.includes('Mia'))).toBe(true);
  });

  it('follow a choice made on the other install: a notice switched off in an app’s settings is gone on both', async () => {
    const { remote } = fakeServer();
    const a = install(remote, memoryStorage());
    const b = install(remote, memoryStorage());
    seed(false);
    copyToStorage(a.storage);
    a.storage.setItem('ktema:settings', JSON.stringify({ started: true, notices: { on: false, at: '09:00', warranties: false } }));
    await a.engine.sync();
    await b.engine.sync();
    const fromA = await noticesOn(a);
    const fromB = await noticesOn(b);
    expect(fromB).toEqual(fromA);
    expect(fromB.some((line) => line.startsWith('upkeep'))).toBe(false);
  });
});
