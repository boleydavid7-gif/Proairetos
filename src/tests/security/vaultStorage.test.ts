// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createKeys } from '../../data/sync/keys';
import { createVault, withAccount, type VaultHeader } from '../../data/security/vault';
import { StoreUnavailable, createVaultStorage, indexedDbHeader, localStorageHeader, type HeaderStore } from '../../data/security/vaultStorage';

function memory(initial: string | null = null): HeaderStore & { text: string | null } {
  const store = {
    text: initial,
    async read() {
      return store.text;
    },
    async write(value: string) {
      store.text = value;
    },
  };
  return store;
}

async function header(): Promise<VaultHeader> {
  const setup = await createKeys('a long passphrase for tests');
  const made = (await createVault(setup.dataKey, { userId: 'u1', passphrase: setup.passphraseWrap, recovery: setup.recoveryWrap, passkeys: [] })).header;
  // As it comes back from storage: JSON drops fields that are undefined.
  return JSON.parse(JSON.stringify(made)) as VaultHeader;
}

describe('where the vault header is kept', () => {
  it('has nothing at first, and saves to both places', async () => {
    const a = memory();
    const b = memory();
    const storage = createVaultStorage(a, b);
    expect(await storage.load()).toEqual({ state: 'none' });
    const made = await header();
    await storage.save(made);
    expect(a.text).toBe(b.text);
    expect(await storage.load()).toMatchObject({ state: 'ok', header: made, repaired: false });
  });

  it('survives losing one copy and writes it back', async () => {
    const made = await header();
    for (const lost of ['primary', 'secondary'] as const) {
      const a = memory(JSON.stringify(made));
      const b = memory(JSON.stringify(made));
      (lost === 'primary' ? a : b).text = null;
      const loaded = await createVaultStorage(a, b).load();
      expect(loaded).toMatchObject({ state: 'ok', header: made, repaired: true });
      expect(a.text).toBe(b.text);
    }
  });

  it('survives one copy being damaged', async () => {
    const made = await header();
    const a = memory('{"damaged":');
    const b = memory(JSON.stringify(made));
    expect(await createVaultStorage(a, b).load()).toMatchObject({ state: 'ok', header: made, repaired: true });
    expect(a.text).toBe(JSON.stringify(made));
  });

  it('takes the newer valid copy and brings the older one up to it', async () => {
    const older = await header();
    const newer = withAccount(older, older.account, new Date(Date.now() + 60_000));
    const a = memory(JSON.stringify(older));
    const b = memory(JSON.stringify(newer));
    const loaded = await createVaultStorage(a, b).load();
    expect(loaded).toMatchObject({ state: 'ok', header: newer });
    expect(a.text).toBe(JSON.stringify(newer));
  });

  it('says corrupt when something is stored and none of it is valid, and never overwrites it', async () => {
    const a = memory('garbage');
    const b = memory('{"v":1}');
    expect(await createVaultStorage(a, b).load()).toEqual({ state: 'corrupt' });
    expect(a.text).toBe('garbage');
    expect(b.text).toBe('{"v":1}');
  });

  it('still reads when one place cannot be read at all', async () => {
    const made = await header();
    const broken: HeaderStore = { read: async () => Promise.reject(new Error('blocked')), write: async () => Promise.reject(new Error('blocked')) };
    expect(await createVaultStorage(memory(JSON.stringify(made)), broken).load()).toMatchObject({ state: 'ok', header: made });
  });

  it('keeps the real places apart from the main database and from the backed-up settings', async () => {
    const made = await header();
    const storage = createVaultStorage(localStorageHeader(), indexedDbHeader());
    await storage.save(made);
    expect(localStorage.getItem('proairetosVault')).toBe(JSON.stringify(made));
    const names = (await indexedDB.databases()).map((db) => db.name);
    expect(names).toContain('proairetos-vault');
    expect(names).not.toContain('proairetos');
    expect('proairetosVault'.startsWith('proairetos.')).toBe(false);
    localStorage.removeItem('proairetosVault');
    expect(await storage.load()).toMatchObject({ state: 'ok', header: made, repaired: true });
    expect(localStorage.getItem('proairetosVault')).toBe(JSON.stringify(made));
  });

  it('reads with nothing stored without making anything: no database appears until a vault is saved', async () => {
    const before = (await indexedDB.databases()).map((db) => db.name);
    const storage = createVaultStorage(localStorageHeader('proairetosVaultTest'), indexedDbHeader(undefined, 'proairetos-vault-never-made'));
    expect(await storage.load()).toEqual({ state: 'none' });
    expect((await indexedDB.databases()).map((db) => db.name)).toEqual(before);
    expect((await indexedDB.databases()).map((db) => db.name)).not.toContain('proairetos-vault-never-made');
  });

  describe('whether there is no vault is only said when every place that exists was read', () => {
    const refuses: HeaderStore = { read: async () => Promise.reject(new Error('storage is blocked')), write: async () => Promise.reject(new Error('blocked')) };
    const absent: HeaderStore = { read: async () => Promise.reject(new StoreUnavailable()), write: async () => Promise.reject(new StoreUnavailable()) };

    it('says none when both were read and are empty', async () => {
      expect(await createVaultStorage(memory(), memory()).load()).toEqual({ state: 'none' });
    });

    it('does not say none when the first is empty and the second cannot be read: a vault may be there', async () => {
      expect(await createVaultStorage(memory(), refuses).load()).toEqual({ state: 'unverified' });
      expect(await createVaultStorage(refuses, memory()).load()).toEqual({ state: 'unverified' });
      expect(await createVaultStorage(refuses, refuses).load()).toEqual({ state: 'unverified' });
    });

    it('says none when a place does not exist here at all and the other is empty', async () => {
      expect(await createVaultStorage(memory(), absent).load()).toEqual({ state: 'none' });
      expect(await createVaultStorage(absent, absent).load()).toEqual({ state: 'none' });
    });

    it('is unverified when one place does not exist and the other cannot be read', async () => {
      expect(await createVaultStorage(absent, refuses).load()).toEqual({ state: 'unverified' });
    });

    it('finds the vault in the second place when the first is empty or cannot be read, and does not write to a place it could not read', async () => {
      const made = await header();
      const second = memory(JSON.stringify(made));
      expect(await createVaultStorage(memory(), second).load()).toMatchObject({ state: 'ok', header: made, repaired: true });
      const writes: string[] = [];
      const blocked: HeaderStore = { read: refuses.read, write: async (text) => void writes.push(text) };
      expect(await createVaultStorage(blocked, memory(JSON.stringify(made))).load()).toMatchObject({ state: 'ok', header: made });
      expect(writes).toEqual([]);
    });

    it('says corrupt, not none, when something is stored and none of it is valid, even if the other place cannot be read', async () => {
      expect(await createVaultStorage(memory('garbage'), refuses).load()).toEqual({ state: 'corrupt' });
    });

    it('the real browser storage: blocked localStorage is unverified, a missing IndexedDB is not', async () => {
      const real = localStorageHeader('proairetosVaultBlocked');
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });
      try {
        expect(await createVaultStorage(real, indexedDbHeader(undefined, 'proairetos-vault-never-made-2')).load()).toEqual({ state: 'unverified' });
      } finally {
        spy.mockRestore();
      }
      expect(await createVaultStorage(real, indexedDbHeader(undefined, 'proairetos-vault-never-made-2')).load()).toEqual({ state: 'none' });
    });
  });
});
