import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stand-ins: the person's own storage folder, the site's server buckets, and the account's key.
const files = new Map<string, Uint8Array<ArrayBuffer>>();
const folder = {
  list: async () => [...files.keys()].map((name) => ({ name, version: '1' })),
  read: async (name: string) => files.get(name) ?? null,
  write: async (name: string, bytes: Uint8Array<ArrayBuffer>) => void files.set(name, bytes),
  remove: async (name: string) => void files.delete(name),
};
const server = new Map<string, Uint8Array<ArrayBuffer>>();
let connected = true;
const seal = (label: string, bytes: ArrayBuffer) => new Uint8Array([...new TextEncoder().encode(`${label}|`), ...new Uint8Array(bytes)]);

vi.mock('../../app/sync/syncController', () => ({
  ownBackupStorage: async () => (connected ? { name: 'Dropbox', folder } : null),
  sealWithAccount: async (label: string, bytes: ArrayBuffer) => ({ userId: 'u', sealed: seal(label, bytes) }),
  openWithAccount: async (label: string, sealed: ArrayBuffer) => {
    const all = new Uint8Array(sealed);
    const head = new TextEncoder().encode(`${label}|`);
    return head.every((b, i) => all[i] === b) ? all.slice(head.length).buffer : null;
  },
}));
vi.mock('../../data/sync/supabase', () => ({
  isSyncConfigured: true,
  currentUser: async () => ({ id: 'u' }),
  supabase: async () => ({
    storage: {
      from: () => ({
        upload: async () => ({ error: { message: 'no new copies on the server' } }),
        download: async (path: string) => (server.has(path) ? { data: new Blob([server.get(path)!]), error: null } : { data: null, error: { message: 'Object not found' } }),
        remove: async (paths: string[]) => {
          paths.forEach((path) => server.delete(path));
          return { error: null };
        },
      }),
    },
  }),
}));

const { downloadSealed, uploadSealed, NO_OWN_STORAGE } = await import('../../theoria/data/cloudCopy');
const { moveServerCopies } = await import('../../theoria/data/library');
const { makeBook } = await import('../../theoria/core/books');

const bytes = (text: string) => new TextEncoder().encode(text).buffer;

describe('book copies in the person’s own storage', () => {
  beforeEach(() => {
    files.clear();
    server.clear();
    connected = true;
  });

  it('keeps the sealed file in their storage, never on the server', async () => {
    const path = await uploadSealed('book', 'b1', new Blob(['the whole book']));
    expect(path).toBe('own:book-b1.sealed');
    expect(new TextDecoder().decode(files.get('book-b1.sealed')!)).toBe('theoria:book:b1|the whole book');
    expect(await (await downloadSealed('book', 'b1', path)).text()).toBe('the whole book');
  });

  it('says where to choose storage when there is none', async () => {
    connected = false;
    await expect(uploadSealed('book', 'b1', new Blob(['x']))).rejects.toThrow(NO_OWN_STORAGE);
  });

  it('moves server copies into their storage, and lets go of copies of cloud-folder books', async () => {
    server.set('u/b1/book.sealed', seal('theoria:book:b1', bytes('kept book')));
    server.set('u/b2/book.sealed', seal('theoria:book:b2', bytes('folder book')));
    server.set('u/b2/cover.sealed', seal('theoria:cover:b2', bytes('cover')));
    const kept = { ...makeBook('u', { title: 'Kept', source: 'upload' }), id: 'b1', filePath: 'u/b1/book.sealed', sealed: true, cloudCopy: true };
    const fromFolder = { ...makeBook('u', { title: 'From the folder', source: 'upload' }), id: 'b2', fromFolder: 'onedrive:Books/b2.epub', filePath: 'u/b2/book.sealed', sealed: true, coverPath: 'u/b2/cover.sealed', coverSealed: true, cloudCopy: true };
    const plain = { ...makeBook('u', { title: 'Only here', source: 'upload' }), id: 'b3' };

    const changed = await moveServerCopies([kept, fromFolder, plain]);
    expect(server.size).toBe(0);
    const moved = changed.find((book) => book.id === 'b1')!;
    expect(moved.filePath).toBe('own:book-b1.sealed');
    expect(new TextDecoder().decode(files.get('book-b1.sealed')!)).toBe('theoria:book:b1|kept book');
    const released = changed.find((book) => book.id === 'b2')!;
    expect([released.filePath, released.coverPath, released.cloudCopy]).toEqual([undefined, undefined, undefined]);
    expect(changed).toHaveLength(2);
  });

  it('leaves a server copy where it is while there is no storage of their own', async () => {
    connected = false;
    server.set('u/b1/book.sealed', seal('theoria:book:b1', bytes('kept book')));
    const kept = { ...makeBook('u', { title: 'Kept', source: 'upload' }), id: 'b1', filePath: 'u/b1/book.sealed', sealed: true, cloudCopy: true };
    expect(await moveServerCopies([kept])).toEqual([]);
    expect(server.size).toBe(1);
  });
});
