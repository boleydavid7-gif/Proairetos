// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createKeys, createKeysForPasskey, openRecord, sealRecord, unlockWithPassphrase, unlockWithPasskey, unlockWithRecoveryKey, wrapWithPasskey, KeyError } from '../../data/sync/keys';
import { VaultError, createVault, isVaultKey, openVault, parseHeader, withAccount, type AccountEnvelopes } from '../../data/security/vault';

const PASS = 'a long passphrase for tests';

async function account() {
  const setup = await createKeys(PASS);
  const envelopes: AccountEnvelopes = { userId: 'u1', passphrase: setup.passphraseWrap, recovery: setup.recoveryWrap, passkeys: [] };
  return { setup, envelopes };
}

describe('the local vault key', () => {
  it('is new and different every time, and cannot be exported', async () => {
    const { setup, envelopes } = await account();
    const one = await createVault(setup.dataKey, envelopes);
    const two = await createVault(setup.dataKey, envelopes);
    expect(one.header.id).not.toBe(two.header.id);
    expect(one.header.lvk.ct).not.toBe(two.header.lvk.ct);
    expect(one.lvk.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', one.lvk)).rejects.toThrow();
    // What one key seals the other cannot open.
    const sealed = await sealRecord(one.lvk, 'local:items', 'a', { title: 'x' });
    await expect(openRecord(two.lvk, 'local:items', 'a', sealed)).rejects.toBeInstanceOf(KeyError);
  });

  it('opens with the account key it was sealed under and gives the same key back', async () => {
    const { setup, envelopes } = await account();
    const { header, lvk } = await createVault(setup.dataKey, envelopes);
    const opened = await openVault(header, setup.dataKey);
    const sealed = await sealRecord(lvk, 'local:items', 'a', { title: 'hello' });
    expect(await openRecord(opened, 'local:items', 'a', sealed)).toEqual({ title: 'hello' });
    expect(await isVaultKey(header, opened)).toBe(true);
  });

  it('seals with a fresh nonce each time and binds a value to its store and id', async () => {
    const { setup, envelopes } = await account();
    const { lvk } = await createVault(setup.dataKey, envelopes);
    const nonces = new Set<string>();
    for (let i = 0; i < 2000; i++) nonces.add((await sealRecord(lvk, 'local:items', String(i), { i })).iv);
    expect(nonces.size).toBe(2000);
    const sealed = await sealRecord(lvk, 'local:items', 'a', { title: 'x' });
    await expect(openRecord(lvk, 'local:items', 'b', sealed)).rejects.toBeInstanceOf(KeyError);
    await expect(openRecord(lvk, 'local:notes', 'a', sealed)).rejects.toBeInstanceOf(KeyError);
  });

  it('does not open with another account’s key', async () => {
    const { setup, envelopes } = await account();
    const other = await createKeys('another long passphrase');
    const { header } = await createVault(setup.dataKey, envelopes);
    await expect(openVault(header, other.dataKey)).rejects.toMatchObject({ code: 'cannot-open' });
  });

  it('opens through each way the account opens: passphrase, recovery key and passkey', async () => {
    const setup = await createKeysForPasskey(PASS);
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const wrap = await wrapWithPasskey(setup.exportable, secret);
    const envelopes: AccountEnvelopes = { userId: 'u1', passphrase: setup.passphraseWrap, recovery: setup.recoveryWrap, passkeys: [{ credentialId: 'cred', wrap }] };
    const { header, lvk } = await createVault(setup.dataKey, envelopes);
    const sealed = await sealRecord(lvk, 'local:items', 'a', { n: 1 });
    for (const accountKey of [
      await unlockWithPassphrase(header.account.passphrase!, PASS),
      await unlockWithRecoveryKey(header.account.recovery, setup.recoveryKey),
      await unlockWithPasskey(header.account.passkeys[0].wrap, secret),
    ]) {
      expect(await openRecord(await openVault(header, accountKey), 'local:items', 'a', sealed)).toEqual({ n: 1 });
    }
  });

  it('refuses a wrong passphrase, recovery key or passkey secret before touching the vault', async () => {
    const setup = await createKeysForPasskey(PASS);
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const envelopes: AccountEnvelopes = { userId: 'u1', passphrase: setup.passphraseWrap, recovery: setup.recoveryWrap, passkeys: [{ credentialId: 'c', wrap: await wrapWithPasskey(setup.exportable, secret) }] };
    const { header } = await createVault(setup.dataKey, envelopes);
    await expect(unlockWithPassphrase(header.account.passphrase!, 'not the passphrase')).rejects.toBeInstanceOf(KeyError);
    await expect(unlockWithRecoveryKey(header.account.recovery, 'AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA')).rejects.toBeInstanceOf(KeyError);
    await expect(unlockWithPasskey(header.account.passkeys[0].wrap, crypto.getRandomValues(new Uint8Array(32)))).rejects.toBeInstanceOf(KeyError);
  });

  it('keeps working after the passphrase changes, because only the account’s wrapped copy changes', async () => {
    const { setup, envelopes } = await account();
    const { header, lvk } = await createVault(setup.dataKey, envelopes);
    const sealed = await sealRecord(lvk, 'local:items', 'a', { n: 1 });
    const { rewrapWithPassphrase } = await import('../../data/sync/keys');
    const exportable = await unlockWithPassphrase(setup.passphraseWrap, PASS, true);
    const next = withAccount(header, { ...envelopes, passphrase: await rewrapWithPassphrase(exportable, 'a brand new passphrase') });
    await expect(unlockWithPassphrase(next.account.passphrase!, PASS)).rejects.toBeInstanceOf(KeyError);
    const key = await unlockWithPassphrase(next.account.passphrase!, 'a brand new passphrase');
    expect(await openRecord(await openVault(next, key), 'local:items', 'a', sealed)).toEqual({ n: 1 });
    expect(next.lvk).toEqual(header.lvk);
    expect(next.check).toEqual(header.check);
  });
});

describe('a header that is damaged', () => {
  async function stored() {
    const { setup, envelopes } = await account();
    const { header } = await createVault(setup.dataKey, envelopes);
    return { setup, header, text: JSON.stringify(header) };
  }
  const flip = (b64: string) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    bytes[Math.floor(bytes.length / 2)] ^= 0xff;
    return btoa(String.fromCharCode(...bytes));
  };

  it('reads an intact one', async () => {
    const { header, text } = await stored();
    expect(parseHeader(text)).toEqual(JSON.parse(JSON.stringify(header)));
  });

  it.each([
    ['nothing', null],
    ['text that is not JSON', '{oops'],
    ['an array', '[]'],
    ['an empty object', '{}'],
  ])('calls %s corrupt', (_name, text) => {
    expect(() => parseHeader(text as string | null)).toThrow(VaultError);
    expect(() => parseHeader(text as string | null)).toThrow(/could not be read/);
  });

  it('calls a header with a field wrong, missing or of another version corrupt', async () => {
    const { header } = await stored();
    const broken: Record<string, unknown>[] = [
      { ...header, v: 2 },
      { ...header, id: 'short' },
      { ...header, lvk: { iv: 'AAAA', ct: header.lvk.ct } },
      { ...header, lvk: { iv: header.lvk.iv } },
      { ...header, check: 'text' },
      { ...header, updatedAt: 'yesterday' },
      { ...header, account: { ...header.account, recovery: { method: 'recovery' } } },
      { ...header, account: { ...header.account, userId: '' } },
      { ...header, account: { ...header.account, passkeys: [{ credentialId: 'c' }] } },
      { ...header, lvk: { iv: header.lvk.iv, ct: '!!not base64!!' } },
    ];
    for (const value of broken) expect(() => parseHeader(JSON.stringify(value))).toThrow(VaultError);
  });

  it('does not open when the sealed key has been altered, and says the vault is damaged when the check has', async () => {
    const { setup, header } = await stored();
    await expect(openVault({ ...header, lvk: { ...header.lvk, ct: flip(header.lvk.ct) } }, setup.dataKey)).rejects.toMatchObject({ code: 'cannot-open' });
    await expect(openVault({ ...header, check: { ...header.check, ct: flip(header.check.ct) } }, setup.dataKey)).rejects.toMatchObject({ code: 'corrupt' });
    // A header moved to another vault’s id no longer opens either.
    await expect(openVault({ ...header, id: btoa('0123456789abcdef') }, setup.dataKey)).rejects.toMatchObject({ code: 'cannot-open' });
  });
});
