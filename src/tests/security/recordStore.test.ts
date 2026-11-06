// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createKeys, KeyError } from '../../data/sync/keys';
import { createVault } from '../../data/security/vault';
import { LockedError, SecureRecordStore, isSealedValue, memoryBackend } from '../../data/security/recordStore';

async function lvk() {
  const setup = await createKeys('a long passphrase for tests');
  return (await createVault(setup.dataKey, { userId: 'u1', passphrase: setup.passphraseWrap, recovery: setup.recoveryWrap, passkeys: [] })).lvk;
}

describe('the record store interface', () => {
  it('stores plain values as they are by default, so nothing changes for a store that is not sealed', async () => {
    const backend = memoryBackend();
    const store = new SecureRecordStore<{ title: string }>('items', backend, () => {
      throw new LockedError();
    });
    await store.put('a', { title: 'plain' });
    expect(await backend.get('a')).toEqual({ title: 'plain' });
    expect(await store.get('a')).toEqual({ title: 'plain' });
    expect(await store.counts()).toEqual({ sealed: 0, plain: 1 });
  });

  it('reads both forms, whatever the mode, so a build that only reads can work on a mixed store', async () => {
    const key = await lvk();
    const backend = memoryBackend();
    const writer = new SecureRecordStore<{ title: string }>('items', backend, () => key, 'sealed');
    await writer.put('sealed', { title: 'secret' });
    await backend.put('plain', { title: 'open' });
    const reader = new SecureRecordStore<{ title: string }>('items', backend, () => key, 'plain');
    expect(await reader.get('sealed')).toEqual({ title: 'secret' });
    expect(await reader.get('plain')).toEqual({ title: 'open' });
    expect((await reader.all()).map((row) => row.id).sort()).toEqual(['plain', 'sealed']);
    expect(await reader.counts()).toEqual({ sealed: 1, plain: 1 });
  });

  it('stores nothing readable in a sealed store', async () => {
    const key = await lvk();
    const backend = memoryBackend();
    const store = new SecureRecordStore<{ title: string }>('items', backend, () => key, 'sealed');
    await store.put('a', { title: 'CANARY-title' });
    const raw = await backend.get('a');
    expect(isSealedValue(raw)).toBe(true);
    expect(JSON.stringify(raw)).not.toContain('CANARY');
  });

  it('will not open a sealed value while locked, but still reads plain ones', async () => {
    const key = await lvk();
    const backend = memoryBackend();
    await new SecureRecordStore<{ n: number }>('items', backend, () => key, 'sealed').put('a', { n: 1 });
    await backend.put('b', { n: 2 });
    const locked = new SecureRecordStore<{ n: number }>('items', backend, () => {
      throw new LockedError();
    });
    await expect(locked.get('a')).rejects.toBeInstanceOf(LockedError);
    expect(await locked.get('b')).toEqual({ n: 2 });
    await expect(locked.all()).rejects.toBeInstanceOf(LockedError);
  });

  it('will not open a sealed value moved to another id or another store', async () => {
    const key = await lvk();
    const backend = memoryBackend();
    const store = new SecureRecordStore<{ n: number }>('items', backend, () => key, 'sealed');
    await store.put('a', { n: 1 });
    await backend.put('b', await backend.get('a'));
    await expect(store.get('b')).rejects.toBeInstanceOf(KeyError);
    const other = memoryBackend();
    await other.put('a', await backend.get('a'));
    await expect(new SecureRecordStore<{ n: number }>('notes', other, () => key).get('a')).rejects.toBeInstanceOf(KeyError);
  });

  it('does not open a value sealed under another key', async () => {
    const backend = memoryBackend();
    const one = await lvk();
    const two = await lvk();
    await new SecureRecordStore<{ n: number }>('items', backend, () => one, 'sealed').put('a', { n: 1 });
    await expect(new SecureRecordStore<{ n: number }>('items', backend, () => two).get('a')).rejects.toBeInstanceOf(KeyError);
  });

  it('deletes without needing the key', async () => {
    const key = await lvk();
    const backend = memoryBackend();
    const store = new SecureRecordStore<{ n: number }>('items', backend, () => key, 'sealed');
    await store.put('a', { n: 1 });
    await new SecureRecordStore<{ n: number }>('items', backend, () => {
      throw new LockedError();
    }).delete('a');
    expect(await store.get('a')).toBeUndefined();
  });
});
