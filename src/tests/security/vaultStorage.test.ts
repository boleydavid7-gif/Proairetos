// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createKeys } from '../../data/sync/keys';
import { createVault, withAccount, type VaultHeader } from '../../data/security/vault';
import { createVaultStorage, indexedDbHeader, localStorageHeader, type HeaderStore } from '../../data/security/vaultStorage';

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
});
