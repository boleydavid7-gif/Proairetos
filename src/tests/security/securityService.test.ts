// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LockedError } from '../../data/security/locked';
import { openRecord, sealRecord, createKeys, createKeysForPasskey, wrapWithPasskey, rewrapWithPassphrase, unlockWithPassphrase, KeyError } from '../../data/sync/keys';
import { createVaultStorage, type HeaderStore } from '../../data/security/vaultStorage';
import { createSecurityService, type SecurityService } from '../../app/security/securityService';
import type { AccountEnvelopes } from '../../data/security/vault';

/*
 * Several copies of the service in one process stand in for several pages of one browser (Proairetos and its companion
 * apps): they share the stored header and one BroadcastChannel name, and each has its own memory.
 */
const PASS = 'a long passphrase for tests';
const wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

function memory(): HeaderStore & { text: string | null } {
  const store = {
    text: null as string | null,
    async read() {
      return store.text;
    },
    async write(value: string) {
      store.text = value;
    },
  };
  return store;
}


/**
 * A BroadcastChannel stand-in for tests: same names reach each other, messages are copied with structuredClone (so a key
 * object is passed the way a browser passes it) and arrive a moment later, never to the page that sent them. Node's own
 * BroadcastChannel cannot send some CryptoKey objects, which browsers can; the real browser is checked separately.
 */
const buses = new Map<string, Set<FakeChannel>>();
class FakeChannel extends EventTarget {
  constructor(readonly name: string, private readonly failToPost = false) {
    super();
    buses.set(name, (buses.get(name) ?? new Set()).add(this));
  }
  postMessage(data: unknown) {
    if (this.failToPost) throw new DOMException('could not be cloned', 'DataCloneError');
    for (const other of buses.get(this.name) ?? []) {
      if (other === this) continue;
      const copy = structuredClone(data);
      setTimeout(() => other.dispatchEvent(new MessageEvent('message', { data: copy })), 0);
    }
  }
  close() {
    buses.get(this.name)?.delete(this);
  }
}
const channelFor = (failToPost = false) => new FakeChannel(channelName, failToPost) as unknown as BroadcastChannel;

let primary: ReturnType<typeof memory>;
let secondary: ReturnType<typeof memory>;
let open: SecurityService[];
let known = false;
let channelName: string;

/** A page: its own service over the shared storage and channel. */
function page(overrides: { channel?: () => BroadcastChannel | null } = {}): SecurityService {
  const service = createSecurityService({
    storage: createVaultStorage(primary, secondary),
    openChannel: overrides.channel ?? (() => channelFor()),
    exclusive: (task) => task(),
    now: () => new Date(),
    vaultKnown: () => known,
    checkTimeoutMs: 400,
  });
  open.push(service);
  return service;
}

async function account(passkeySecret?: Uint8Array<ArrayBuffer>) {
  const setup = await createKeysForPasskey(PASS);
  const envelopes: AccountEnvelopes = {
    userId: 'u1',
    passphrase: setup.passphraseWrap,
    recovery: setup.recoveryWrap,
    passkeys: passkeySecret ? [{ credentialId: 'cred-1', wrap: await wrapWithPasskey(setup.exportable, passkeySecret) }] : [],
  };
  return { setup, envelopes };
}

beforeEach(() => {
  primary = memory();
  secondary = memory();
  open = [];
  known = false;
  channelName = `test-${Math.random()}`;
});
afterEach(() => open.forEach((service) => service.close()));

describe('with no vault', () => {
  it('stays out of the way: no phase change, nothing to lock, no key', async () => {
    const service = page();
    await service.start();
    expect(service.status().phase).toBe('none');
    service.lock();
    expect(service.status().phase).toBe('none');
    expect(() => service.key()).toThrow(LockedError);
    const { setup } = await account();
    await service.unlockWithAccountKey(setup.dataKey);
    expect(service.status().phase).toBe('none');
    expect(primary.text).toBeNull();
    expect(secondary.text).toBeNull();
  });
});

describe('making and unlocking the vault', () => {
  it('makes one that is unlocked, stored in both places, and gives a usable key', async () => {
    const { setup, envelopes } = await account();
    const service = page();
    await service.createFromAccountKey(setup.dataKey, envelopes);
    expect(service.status()).toMatchObject({ phase: 'unlocked', userId: 'u1', hasPassphrase: true });
    expect(primary.text).toBe(secondary.text);
    const sealed = await sealRecord(service.key(), 'local:items', 'a', { n: 1 });
    expect(await openRecord(service.key(), 'local:items', 'a', sealed)).toEqual({ n: 1 });
  });

  it('is made once: a second page that tries to make one opens the first', async () => {
    const { setup, envelopes } = await account();
    const one = page();
    await one.createFromAccountKey(setup.dataKey, envelopes);
    const sealed = await sealRecord(one.key(), 'local:items', 'a', { n: 1 });
    const two = page();
    await two.createFromAccountKey(setup.dataKey, envelopes);
    expect(await openRecord(two.key(), 'local:items', 'a', sealed)).toEqual({ n: 1 });
  });

  it('opens with the account password, the recovery key and a passkey, and refuses wrong ones', async () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const { setup, envelopes } = await account(secret);
    const first = page();
    await first.createFromAccountKey(setup.dataKey, envelopes);
    const sealed = await sealRecord(first.key(), 'local:items', 'a', { n: 1 });
    first.lock();

    const byPassword = page();
    await byPassword.start();
    expect(byPassword.status().phase).toBe('locked');
    await expect(byPassword.unlockWithPassphrase('wrong passphrase here')).rejects.toBeInstanceOf(KeyError);
    expect(byPassword.status().phase).toBe('locked');
    await byPassword.unlockWithPassphrase(PASS);
    expect(await openRecord(byPassword.key(), 'local:items', 'a', sealed)).toEqual({ n: 1 });
    byPassword.lock();

    await expect(byPassword.unlockWithRecoveryKey('AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA')).rejects.toBeInstanceOf(KeyError);
    await byPassword.unlockWithRecoveryKey(setup.recoveryKey);
    expect(await openRecord(byPassword.key(), 'local:items', 'a', sealed)).toEqual({ n: 1 });
    byPassword.lock();

    await expect(byPassword.unlockWithPasskey('cred-1', crypto.getRandomValues(new Uint8Array(32)))).rejects.toBeInstanceOf(KeyError);
    await expect(byPassword.unlockWithPasskey('unknown', secret)).rejects.toBeInstanceOf(KeyError);
    await byPassword.unlockWithPasskey('cred-1', secret);
    expect(await openRecord(byPassword.key(), 'local:items', 'a', sealed)).toEqual({ n: 1 });
  });

  it('unlocks with no connection: nothing in it reaches the network', async () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const { setup, envelopes } = await account(secret);
    const first = page();
    await first.createFromAccountKey(setup.dataKey, envelopes);
    first.lock();
    const calls = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    vi.stubGlobal('fetch', calls);
    try {
      const offline = page();
      await offline.start();
      await offline.unlockWithPassphrase(PASS);
      expect(offline.status().phase).toBe('unlocked');
      offline.lock();
      await offline.unlockWithRecoveryKey(setup.recoveryKey);
      expect(offline.status().phase).toBe('unlocked');
      expect(calls).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('takes the account key the sync controller already has', async () => {
    const { setup, envelopes } = await account();
    const first = page();
    await first.createFromAccountKey(setup.dataKey, envelopes);
    first.lock();
    const second = page();
    await second.unlockWithAccountKey(setup.dataKey);
    expect(second.status().phase).toBe('unlocked');
  });

  it('does not open for the wrong account’s key, and stays locked', async () => {
    const { setup, envelopes } = await account();
    const first = page();
    await first.createFromAccountKey(setup.dataKey, envelopes);
    first.lock();
    const other = await createKeys('another long passphrase');
    await expect(first.unlockWithAccountKey(other.dataKey)).rejects.toMatchObject({ code: 'cannot-open' });
    expect(first.status().phase).toBe('locked');
  });

  it('follows a new passphrase once the account’s new wrapped key is remembered, without sealing anything again', async () => {
    const { setup, envelopes } = await account();
    const first = page();
    await first.createFromAccountKey(setup.dataKey, envelopes);
    const sealed = await sealRecord(first.key(), 'local:items', 'a', { n: 1 });
    const exportable = await unlockWithPassphrase(setup.passphraseWrap!, PASS, true);
    await first.rememberAccount({ ...envelopes, passphrase: await rewrapWithPassphrase(exportable, 'a brand new passphrase') });
    first.lock();
    await expect(first.unlockWithPassphrase(PASS)).rejects.toBeInstanceOf(KeyError);
    await first.unlockWithPassphrase('a brand new passphrase');
    expect(await openRecord(first.key(), 'local:items', 'a', sealed)).toEqual({ n: 1 });
  });
});

describe('locking across pages', () => {
  it('unlocking in one page unlocks the others open now; locking in one locks them all', async () => {
    const { setup, envelopes } = await account();
    const a = page();
    await a.createFromAccountKey(setup.dataKey, envelopes);
    const b = page();
    const c = page();
    await b.start();
    await c.start();
    await wait();
    // Pages that open while another is unlocked ask for the key and get it.
    expect(b.status().phase).toBe('unlocked');
    expect(c.status().phase).toBe('unlocked');
    const sealed = await sealRecord(b.key(), 'local:items', 'a', { n: 1 });
    expect(await openRecord(c.key(), 'local:items', 'a', sealed)).toEqual({ n: 1 });

    b.lock();
    await wait();
    expect([a, b, c].map((each) => each.status().phase)).toEqual(['locked', 'locked', 'locked']);
    for (const each of [a, b, c]) expect(() => each.key()).toThrow(LockedError);

    // One unlock, anywhere, reaches every page.
    await c.unlockWithPassphrase(PASS);
    await wait();
    expect([a, b, c].map((each) => each.status().phase)).toEqual(['unlocked', 'unlocked', 'unlocked']);
  });

  it('does not give the key to a page that opens when nothing is unlocked', async () => {
    const { setup, envelopes } = await account();
    const a = page();
    await a.createFromAccountKey(setup.dataKey, envelopes);
    a.lock();
    const late = page();
    await late.start();
    await wait();
    expect(late.status().phase).toBe('locked');
    expect(() => late.key()).toThrow(LockedError);
  });

  it('ignores a key that is not the vault’s, even for the right vault id', async () => {
    const { setup, envelopes } = await account();
    const a = page();
    await a.createFromAccountKey(setup.dataKey, envelopes);
    a.lock();
    const id = JSON.parse(primary.text!).id as string;
    const wrong = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const forger = channelFor();
    forger.postMessage({ t: 'key', vault: id, key: wrong });
    forger.postMessage({ t: 'key', vault: id, key: 'not a key' });
    forger.postMessage({ t: 'lock', vault: 'another vault' });
    await wait();
    forger.close();
    expect(a.status().phase).toBe('locked');
  });

  it('stays locked, without an error, in a browser that cannot pass a key between pages', async () => {
    const { setup, envelopes } = await account();
    const a = page({ channel: () => channelFor(true) });
    await a.createFromAccountKey(setup.dataKey, envelopes);
    expect(a.status().phase).toBe('unlocked');
    a.lock();
    expect(a.status().phase).toBe('locked');
    await a.unlockWithPassphrase(PASS);
    expect(a.status().phase).toBe('unlocked');
  });

  it('a page opened after the vault was made elsewhere learns of it', async () => {
    const early = page();
    await early.start();
    expect(early.status().phase).toBe('none');
    const { setup, envelopes } = await account();
    const maker = page();
    await maker.createFromAccountKey(setup.dataKey, envelopes);
    await wait();
    expect(early.status().phase).toBe('unlocked');
  });
});

describe('a damaged vault', () => {
  it('says corrupt, opens nothing, and leaves what is stored alone', async () => {
    primary.text = 'garbage';
    secondary.text = '{"v":1}';
    const service = page();
    await service.start();
    expect(service.status().phase).toBe('corrupt');
    const { setup } = await account();
    await expect(service.unlockWithAccountKey(setup.dataKey)).resolves.toBeUndefined();
    await expect(service.unlockWithPassphrase(PASS)).rejects.toMatchObject({ code: 'corrupt' });
    expect(() => service.key()).toThrow(LockedError);
    expect(primary.text).toBe('garbage');
    expect(secondary.text).toBe('{"v":1}');
  });

  it('works from the other copy when one is damaged, and repairs it', async () => {
    const { setup, envelopes } = await account();
    const a = page();
    await a.createFromAccountKey(setup.dataKey, envelopes);
    a.lock();
    primary.text = '{"damaged"';
    const b = page();
    await b.start();
    expect(b.status().phase).toBe('locked');
    await b.unlockWithPassphrase(PASS);
    expect(primary.text).toBe(secondary.text);
  });

  it('a header altered inside, with its shape intact, is reported and not opened', async () => {
    const { setup, envelopes } = await account();
    const a = page();
    await a.createFromAccountKey(setup.dataKey, envelopes);
    a.lock();
    const header = JSON.parse(primary.text!);
    const bytes = Uint8Array.from(atob(header.check.ct), (c) => c.charCodeAt(0));
    bytes[0] ^= 0xff;
    header.check.ct = btoa(String.fromCharCode(...bytes));
    primary.text = secondary.text = JSON.stringify(header);
    const b = page();
    await b.start();
    await expect(b.unlockWithPassphrase(PASS)).rejects.toMatchObject({ code: 'corrupt' });
    expect(b.status().phase).toBe('corrupt');
    expect(() => b.key()).toThrow(LockedError);
  });

describe('when storage cannot be verified', () => {
  const refuses = (): HeaderStore => ({ read: async () => Promise.reject(new Error('blocked')), write: async () => Promise.reject(new Error('blocked')) });

  function blockedPage(first: HeaderStore, second: HeaderStore): SecurityService {
    const service = createSecurityService({
      storage: createVaultStorage(first, second),
      openChannel: () => channelFor(),
      exclusive: (task) => task(),
      now: () => new Date(),
      vaultKnown: () => false,
      checkTimeoutMs: 150,
    });
    open.push(service);
    return service;
  }

  it('starts out checking, never none, and is none only once both places have been read', async () => {
    const service = page();
    expect(service.status().phase).toBe('checking');
    await service.start();
    expect(service.status().phase).toBe('none');
  });

  it('fails closed: unverified, with no key, when a place cannot be read and none is found', async () => {
    const service = blockedPage(memory(), refuses());
    expect(service.status().phase).toBe('checking');
    await service.start();
    expect(service.status().phase).toBe('unverified');
    expect(() => service.key()).toThrow(LockedError);
  });

  it('counts a read that never finishes as unverified', async () => {
    const hangs: HeaderStore = { read: () => new Promise(() => undefined), write: async () => undefined };
    const service = blockedPage(memory(), hangs);
    await service.start();
    expect(service.status().phase).toBe('unverified');
  });

  it('never makes a vault over a place that could not be read, or over damaged data', async () => {
    const { setup, envelopes } = await account();
    const unreadable = blockedPage(memory(), refuses());
    await expect(unreadable.createFromAccountKey(setup.dataKey, envelopes)).rejects.toMatchObject({ code: 'unverified' });
    expect(unreadable.status().phase).toBe('unverified');

    const damaged = memory();
    damaged.text = 'garbage';
    const broken = blockedPage(damaged, memory());
    await expect(broken.createFromAccountKey(setup.dataKey, envelopes)).rejects.toMatchObject({ code: 'corrupt' });
    expect(damaged.text).toBe('garbage');
  });

  it('answers properly when the place can be read again', async () => {
    let blocked = true;
    const flaky: HeaderStore = { read: async () => (blocked ? Promise.reject(new Error('blocked')) : null), write: async () => undefined };
    const service = blockedPage(memory(), flaky);
    await service.start();
    expect(service.status().phase).toBe('unverified');
    blocked = false;
    await service.retry();
    expect(service.status().phase).toBe('none');
  });

  it('a page that has no answer yet and finds the vault in the second place only is locked, not none', async () => {
    const { setup, envelopes } = await account();
    const maker = page();
    await maker.createFromAccountKey(setup.dataKey, envelopes);
    maker.lock();
    primary.text = null; // the browser-storage copy is gone
    const late = page();
    expect(late.status().phase).toBe('checking');
    await late.start();
    expect(late.status().phase).toBe('locked');
    expect(primary.text).toBe(secondary.text);
  });
});
});
