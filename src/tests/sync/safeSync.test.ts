import { createSyncEngine } from '../../data/sync/engine';
import { createKeys, openBytes, sealBytes } from '../../data/sync/keys';
import { createMemoryLocalSyncStore, createMemorySyncStateStore } from '../../data/sync/localStores';
import { syncAttachmentFiles, type FileStore } from '../../data/sync/attachmentFiles';
import { syncedSetting, withDeviceRecords } from '../../data/sync/deviceRecords';
import type { LocalRecord, OutgoingRecord, RemoteRecord, RemoteStore } from '../../data/sync/types';

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
  return { remote, rows, bump: () => ++seq };
}

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  } as Storage;
}

let key: CryptoKey;
beforeAll(async () => {
  key = (await createKeys('quiet river morning')).dataKey;
}, 30_000);

describe('settings travel with the account', () => {
  it('moves settings between devices, keeping device-only ones home', async () => {
    const { remote } = fakeServer();
    const phoneStorage = memoryStorage({
      'proairetos.quietHours': '{"from":"22:00"}',
      'proairetos.displayName': '"Ada"',
      'proairetos.auth': 'secret-session',
    });
    const laptopStorage = memoryStorage();
    const phone = createSyncEngine({
      local: withDeviceRecords(createMemoryLocalSyncStore(), { storage: phoneStorage }),
      state: createMemorySyncStateStore(),
      remote,
      key,
    });
    const laptop = createSyncEngine({
      local: withDeviceRecords(createMemoryLocalSyncStore(), { storage: laptopStorage }),
      state: createMemorySyncStateStore(),
      remote,
      key,
    });
    await phone.sync();
    await laptop.sync();
    expect(laptopStorage.getItem('proairetos.quietHours')).toBe('{"from":"22:00"}');
    expect(laptopStorage.getItem('proairetos.displayName')).toBeNull();
    expect(laptopStorage.getItem('proairetos.auth')).toBeNull();
  });

  it('on a fresh device the account wins over what the device wrote for itself', async () => {
    const { remote } = fakeServer();
    const first = createSyncEngine({
      local: withDeviceRecords(createMemoryLocalSyncStore(), { storage: memoryStorage({ 'proairetos.appearance': '{"theme":"light"}' }) }),
      state: createMemorySyncStateStore(),
      remote,
      key,
    });
    await first.sync();
    const freshStorage = memoryStorage({ 'proairetos.appearance': '{"theme":"dark"}', 'proairetos.energy': '"low"' });
    const fresh = createSyncEngine({
      local: withDeviceRecords(createMemoryLocalSyncStore(), { storage: freshStorage }),
      state: createMemorySyncStateStore(),
      remote,
      key,
    });
    await fresh.sync();
    expect(freshStorage.getItem('proairetos.appearance')).toBe('{"theme":"light"}');
    // What only this device had still goes up.
    const third = memoryStorage();
    await createSyncEngine({
      local: withDeviceRecords(createMemoryLocalSyncStore(), { storage: third }),
      state: createMemorySyncStateStore(),
      remote,
      key,
    }).sync();
    expect(third.getItem('proairetos.energy')).toBe('"low"');
  });

  it('knows which settings are the device\'s own', () => {
    expect(syncedSetting('proairetos.quietHours')).toBe(true);
    expect(syncedSetting('askesis:settings')).toBe(true);
    for (const own of ['proairetos.auth', 'proairetos.displayName', 'proairetos.weather.now', 'proairetos.otherCalendars.work', 'proairetos.onboarded']) {
      expect(syncedSetting(own)).toBe(false);
    }
  });
});

describe('records that commit out of order', () => {
  it('still reaches a device that has already seen a later number', async () => {
    const { remote, rows, bump } = fakeServer();
    const local = createMemoryLocalSyncStore();
    const reader = createSyncEngine({ local, state: createMemorySyncStateStore(), remote, key });
    const writer = createSyncEngine({ local: createMemoryLocalSyncStore({ lifeItems: [{ id: 'later', title: 'b' } as LocalRecord] }), state: createMemorySyncStateStore(), remote, key });
    await writer.sync();
    await reader.sync();
    expect((await local.list('lifeItems')).map((r) => r.id)).toEqual(['later']);
    // A record whose write got number 1 but became visible only after number 2 was already pulled.
    const late = createSyncEngine({ local: createMemoryLocalSyncStore({ lifeItems: [{ id: 'early', title: 'a' } as LocalRecord] }), state: createMemorySyncStateStore(), remote, key });
    await late.sync();
    const row = rows.get('lifeItems:early') as RemoteRecord;
    row.seq = bump() - 2; // below what the reader has already seen, but within the overlap
    rows.set('lifeItems:early', row);
    await reader.sync();
    expect((await local.list('lifeItems')).map((r) => r.id).sort()).toEqual(['early', 'later']);
  });
});

describe('edits on two devices', () => {
  it('keeps this device\'s version and says that it did', async () => {
    const { remote } = fakeServer();
    const a = createMemoryLocalSyncStore({ lifeItems: [{ id: 'x', title: 'start' } as LocalRecord] });
    const b = createMemoryLocalSyncStore();
    const phone = createSyncEngine({ local: a, state: createMemorySyncStateStore(), remote, key });
    const laptop = createSyncEngine({ local: b, state: createMemorySyncStateStore(), remote, key });
    await phone.sync();
    await laptop.sync();
    await a.put('lifeItems', { id: 'x', title: 'from phone' });
    await b.put('lifeItems', { id: 'x', title: 'from laptop' });
    await phone.sync();
    const result = await laptop.sync();
    expect(result.kept).toBe(1);
    expect((await b.list('lifeItems'))[0].title).toBe('from laptop');
  });
});

describe('photos and files', () => {
  it('seals the bytes, sends them once, fetches them where only the details arrived, and clears removed ones', async () => {
    const stored = new Map<string, Uint8Array>();
    const files: FileStore = {
      async upload(path, bytes) {
        stored.set(path, bytes);
      },
      async download(path) {
        const bytes = stored.get(path);
        return bytes ? (bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer) : null;
      },
      async remove(paths) {
        for (const path of paths) stored.delete(path);
      },
    };
    const photo = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const phone = createMemoryLocalSyncStore({ attachments: [{ id: 'p1', name: 'a.jpg', size: 5, data: photo } as LocalRecord] });
    const phoneState = createMemorySyncStateStore();
    const send = () =>
      syncAttachmentFiles({
        rawList: () => phone.list('attachments'),
        putWithBytes: (record) => phone.put('attachments', record),
        state: phoneState,
        files,
        key,
        userId: 'u1',
      });
    expect(await send()).toEqual({ fetched: 0, sent: 1 });
    expect(await send()).toEqual({ fetched: 0, sent: 0 });
    const sealed = stored.get('u1/attachments/p1') as Uint8Array;
    expect(Array.from(sealed)).not.toContain(undefined);
    expect(new Uint8Array(await openBytes(key, 'attachment:p1', sealed.buffer as ArrayBuffer))).toEqual(new Uint8Array([1, 2, 3, 4, 5]));

    const laptop = createMemoryLocalSyncStore({ attachments: [{ id: 'p1', name: 'a.jpg', size: 5, data: new ArrayBuffer(0) } as LocalRecord] });
    const got = await syncAttachmentFiles({
      rawList: () => laptop.list('attachments'),
      putWithBytes: (record) => laptop.put('attachments', record),
      state: createMemorySyncStateStore(),
      files,
      key,
      userId: 'u1',
    });
    expect(got.fetched).toBe(1);
    expect(((await laptop.list('attachments'))[0].data as ArrayBuffer).byteLength).toBe(5);

    await phone.remove('attachments', 'p1');
    await send();
    expect(stored.has('u1/attachments/p1')).toBe(false);
  });

  it('cannot open a file under a different name', async () => {
    const sealed = await sealBytes(key, 'attachment:one', new Uint8Array([9]).buffer);
    await expect(openBytes(key, 'attachment:two', sealed.buffer)).rejects.toThrow();
  });
});
