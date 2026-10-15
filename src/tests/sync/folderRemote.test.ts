import { createSyncEngine } from '../../data/sync/engine';
import { createFolderFileStore, createFolderRemote, forgetFolder, type CloudFolder } from '../../data/sync/folderRemote';
import { createKeys } from '../../data/sync/keys';
import { createMemoryLocalSyncStore, createMemorySyncStateStore } from '../../data/sync/localStores';
import type { SyncStateStore } from '../../data/sync/types';

/** A stand-in for a Drive, Dropbox or OneDrive app folder. */
function fakeFolder() {
  const files = new Map<string, { bytes: Uint8Array<ArrayBuffer>; version: number }>();
  let version = 0;
  const folder: CloudFolder = {
    async list() {
      return [...files].map(([name, file]) => ({ name, version: String(file.version) }));
    },
    async read(name) {
      return files.get(name)?.bytes ?? null;
    },
    async write(name, bytes) {
      files.set(name, { bytes, version: ++version });
    },
    async remove(name) {
      files.delete(name);
    },
  };
  return { folder, files };
}

let key: CryptoKey;
beforeAll(async () => {
  key = (await createKeys('quiet river morning')).dataKey;
}, 30_000);

function device(folder: CloudFolder, clock: { now: number }) {
  const local = createMemoryLocalSyncStore();
  const state: SyncStateStore = createMemorySyncStateStore();
  return {
    local,
    state,
    async sync() {
      const remote = createFolderRemote({ folder, state, now: () => clock.now });
      const result = await createSyncEngine({ local, state, remote, key }).sync();
      await remote.finish();
      return result;
    },
  };
}

const item = (id: string, title: string) => ({ id, userId: 'local', title, status: 'OPEN' });

describe('sync through a storage folder', () => {
  it('moves records between devices, sealed in the folder', async () => {
    const { folder, files } = fakeFolder();
    const clock = { now: 1000 };
    const phone = device(folder, clock);
    const laptop = device(folder, clock);
    await phone.local.put('lifeItems', item('a', 'Call the clinic'));
    await phone.local.put('reflections', { id: 'r', userId: 'local', body: 'A private thought.' });

    expect(await phone.sync()).toEqual({ pulled: 0, pushed: 2 });
    const stored = [...files.values()].map((file) => new TextDecoder().decode(file.bytes)).join();
    expect(stored).not.toContain('private thought');
    expect(stored).not.toContain('clinic');

    expect((await laptop.sync()).pulled).toBe(2);
    expect(await laptop.local.list('lifeItems')).toEqual([item('a', 'Call the clinic')]);
    // Nothing new: nothing pulled or pushed, and no echo of its own writes.
    expect(await laptop.sync()).toEqual({ pulled: 0, pushed: 0 });
    expect(await phone.sync()).toEqual({ pulled: 0, pushed: 0 });
  });

  it('keeps the newer write, whatever order the files are read in', async () => {
    const { folder } = fakeFolder();
    const clock = { now: 1000 };
    const phone = device(folder, clock);
    const laptop = device(folder, clock);
    await phone.local.put('lifeItems', item('a', 'First'));
    await phone.sync();
    await laptop.sync();

    clock.now = 2000;
    await laptop.local.put('lifeItems', item('a', 'Changed on the laptop'));
    await laptop.sync();
    await phone.sync();
    expect(await phone.local.list('lifeItems')).toEqual([item('a', 'Changed on the laptop')]);

    // A phone whose clock runs behind still writes after what it has seen.
    clock.now = 500;
    await phone.local.put('lifeItems', item('a', 'Then on the device'));
    await phone.sync();
    await laptop.sync();
    expect(await laptop.local.list('lifeItems')).toEqual([item('a', 'Then on the device')]);
  });

  it('carries deletions', async () => {
    const { folder } = fakeFolder();
    const clock = { now: 1000 };
    const phone = device(folder, clock);
    const laptop = device(folder, clock);
    await phone.local.put('lifeItems', item('a', 'x'));
    await phone.sync();
    await laptop.sync();
    clock.now = 2000;
    await laptop.local.remove('lifeItems', 'a');
    await laptop.sync();
    await phone.sync();
    expect(await phone.local.list('lifeItems')).toEqual([]);
  });

  it('folds a device’s own files into one, and others still read everything', async () => {
    const { folder, files } = fakeFolder();
    const clock = { now: 1000 };
    const phone = device(folder, clock);
    for (let i = 0; i < 30; i++) {
      clock.now += 10;
      await phone.local.put('lifeItems', item(`i${i}`, `Thing ${i}`));
      await phone.sync();
    }
    expect([...files.keys()].length).toBeLessThan(26);
    const laptop = device(folder, clock);
    await laptop.sync();
    expect((await laptop.local.list('lifeItems')).length).toBe(30);
  });

  it('starts afresh after forgetting the folder, without losing anything', async () => {
    const { folder } = fakeFolder();
    const clock = { now: 1000 };
    const phone = device(folder, clock);
    await phone.local.put('lifeItems', item('a', 'x'));
    await phone.sync();
    await forgetFolder(phone.state);
    expect((await phone.sync()).pulled).toBe(0);
    expect(await phone.local.list('lifeItems')).toEqual([item('a', 'x')]);
  });

  it('keeps photos and files as one file each', async () => {
    const { folder, files } = fakeFolder();
    const store = createFolderFileStore(folder);
    await store.upload('user-1/attachments/abc', new Uint8Array([1, 2, 3]));
    expect([...files.keys()]).toEqual(['file-abc']);
    expect(new Uint8Array((await store.download('user-1/attachments/abc'))!)).toEqual(new Uint8Array([1, 2, 3]));
    await store.remove(['user-1/attachments/abc']);
    expect(await store.download('user-1/attachments/abc')).toBeNull();
  });
});

describe('moving the account to a folder', () => {
  it('the moving device sends everything; another follows and keeps its own unsent change', async () => {
    const { startAfresh } = await import('../../app/sync/ownStorage');
    const { createSyncEngine: engineFor } = await import('../../data/sync/engine');
    // Both devices first in step through Proairetos's server.
    const rows = new Map<string, import('../../data/sync/types').RemoteRecord>();
    let seq = 0;
    const server = {
      async pull(after: number, limit: number) {
        return [...rows.values()].filter((r) => r.seq > after).sort((a, b) => a.seq - b.seq).slice(0, limit);
      },
      async push(records: import('../../data/sync/types').OutgoingRecord[]) {
        for (const record of records) rows.set(`${record.collection}:${record.id}`, { ...record, seq: ++seq });
      },
    };
    const phone = { local: createMemoryLocalSyncStore(), state: createMemorySyncStateStore() };
    const laptop = { local: createMemoryLocalSyncStore(), state: createMemorySyncStateStore() };
    await phone.local.put('lifeItems', item('a', 'Shared'));
    await engineFor({ ...phone, remote: server, key }).sync();
    await engineFor({ ...laptop, remote: server, key }).sync();
    // The laptop changes something it has not sent yet.
    await laptop.local.put('lifeItems', item('b', 'Only on the laptop so far'));

    const { folder } = fakeFolder();
    const clock = { now: 5000 };
    const viaFolder = async (device: typeof phone) => {
      const remote = createFolderRemote({ folder, state: device.state, now: () => clock.now });
      await engineFor({ ...device, remote, key }).sync();
      await remote.finish();
    };
    await startAfresh(phone.state, 'dropbox', true);
    await viaFolder(phone);
    clock.now = 6000;
    await startAfresh(laptop.state, 'dropbox');
    await viaFolder(laptop);
    clock.now = 7000;
    await viaFolder(phone);

    const titles = async (device: typeof phone) => (await device.local.list('lifeItems')).map((each) => each.title).sort();
    expect(await titles(phone)).toEqual(['Only on the laptop so far', 'Shared']);
    expect(await titles(laptop)).toEqual(['Only on the laptop so far', 'Shared']);
  });
});
