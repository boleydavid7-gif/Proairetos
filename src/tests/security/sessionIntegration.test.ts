// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createKeys, openRecord, sealRecord } from '../../data/sync/keys';
import type { AccountEnvelopes } from '../../data/security/vault';

/*
 * The sync controller and the security service together: the vault locks whenever the account key is forgotten and opens
 * when the controller has the account key. The real controller and Supabase client run over fake storage and a stub network.
 */
vi.stubEnv('VITE_SUPABASE_URL', 'https://stub.test');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');

const net = vi.hoisted(() => ({ calls: [] as string[], serverEndedSession: false, wrapped: null as unknown }));
const b64 = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = () => `${b64({ alg: 'HS256' })}.${b64({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })}.sig`;
const user = { id: 'u1', email: 'a@b.test', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const session = (expiresIn = 3600) => JSON.stringify({ access_token: jwt(), refresh_token: 'r1', expires_at: Math.floor(Date.now() / 1000) + expiresIn, expires_in: 3600, token_type: 'bearer', user });
const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    net.calls.push(`${init?.method ?? 'GET'} ${url.replace('https://stub.test', '')}`);
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (url.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
    if (url.includes('/auth/v1/user')) return reply(user);
    if (url.includes('grant_type=refresh_token')) return net.serverEndedSession ? reply({ error: 'invalid_grant', error_description: 'Invalid Refresh Token' }, 400) : reply({ access_token: jwt(), refresh_token: 'r2', expires_in: 3600, token_type: 'bearer', user });
    if (url.includes('/rest/v1/user_keys')) return reply(net.wrapped);
    if (url.includes('/rest/v1/account_devices') && (init?.method ?? 'GET') === 'GET') return reply(null);
    if (url.includes('/rest/v1/')) return reply([]);
    return reply({});
  }) as typeof fetch;
});

beforeEach(async () => {
  localStorage.clear();
  // The vault header's second copy lives in its own database; each test starts without one.
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('proairetos-vault');
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
  net.calls.length = 0;
  net.serverEndedSession = false;
});

async function accountWithKey() {
  const setup = await createKeys('a long passphrase for tests');
  const envelopes: AccountEnvelopes = { userId: 'u1', passphrase: setup.passphraseWrap, recovery: setup.recoveryWrap, passkeys: [] };
  net.wrapped = { passphrase_wrap: setup.passphraseWrap, recovery_wrap: setup.recoveryWrap };
  const { deviceDatabase } = await import('../../app/services');
  const { createIndexedDbSyncStateStore } = await import('../../data/sync/localStores');
  const state = createIndexedDbSyncStateStore(Promise.resolve((await deviceDatabase)!));
  await state.clear();
  await state.setMeta('dataKey', setup.dataKey);
  localStorage.setItem('proairetos.auth', session());
  localStorage.setItem('proairetosAccount', 'u1');
  return { setup, envelopes, state };
}

async function pages() {
  vi.resetModules();
  const controller = await import('../../app/sync/syncController');
  const { security } = await import('../../app/security/securityService');
  return { controller, security };
}

describe('with no vault', () => {
  it('changes nothing: no vault is made, nothing is stored for it, no extra request is sent', async () => {
    await accountWithKey();
    const { controller, security } = await pages();
    await controller.startSync();
    expect(controller.syncStatus.get().phase).toBe('ready');
    await controller.signOut('local');
    await wait();
    expect(security.status().phase).toBe('none');
    expect(localStorage.getItem('proairetosVault')).toBeNull();
    expect(net.calls.some((call) => call.includes('/rest/v1/passkeys'))).toBe(false);
  });
});

describe('with a vault', () => {
  it('opens when the controller has the account key, and locks on sign-out, leaving the records and the vault as they are', async () => {
    const { setup, envelopes } = await accountWithKey();
    // The vault is made as Stage 3 will make it, from a page that has the account key.
    const maker = await pages();
    await maker.security.createFromAccountKey(setup.dataKey, envelopes);
    const sealed = await sealRecord(maker.security.key(), 'local:items', 'a', { n: 1 });
    const header = localStorage.getItem('proairetosVault');
    maker.security.close();

    const { controller, security } = await pages();
    await controller.startSync();
    await wait();
    expect(controller.syncStatus.get().phase).toBe('ready');
    expect(security.status().phase).toBe('unlocked');
    expect(await openRecord(security.key(), 'local:items', 'a', sealed)).toEqual({ n: 1 });

    localStorage.setItem('proairetos.displayName', 'Sam');
    await controller.signOut('local');
    await wait();
    expect(security.status().phase).toBe('locked');
    expect(() => security.key()).toThrow(/This is locked/);
    expect(localStorage.getItem('proairetosVault')).toBe(header);
    expect(localStorage.getItem('proairetos.displayName')).toBe('Sam');
  });

  it('locks when the session ends without a sign-out here, and opens again with the account key after signing in', async () => {
    const { setup, envelopes } = await accountWithKey();
    const maker = await pages();
    await maker.security.createFromAccountKey(setup.dataKey, envelopes);
    maker.security.close();

    const { controller, security } = await pages();
    await controller.startSync();
    await wait();
    expect(security.status().phase).toBe('unlocked');
    net.serverEndedSession = true;
    localStorage.setItem('proairetos.auth', session(-10));
    const { supabase } = await import('../../data/sync/supabase');
    await (await supabase()).auth.getSession();
    await wait(500);
    expect(controller.syncStatus.get().phase).toBe('signed-out');
    expect(security.status().phase).toBe('locked');
    expect(() => security.key()).toThrow(/This is locked/);
    // The vault opens again with the account password, with no connection and no session.
    await security.unlockWithPassphrase('a long passphrase for tests');
    expect(security.status().phase).toBe('unlocked');
  });

  it('keeps its copies of the account’s wrapped keys current', async () => {
    const { setup, envelopes } = await accountWithKey();
    const maker = await pages();
    await maker.security.createFromAccountKey(setup.dataKey, envelopes);
    maker.security.close();
    // The server now holds a different password wrap (changed on another device).
    const next = await createKeys('a different long passphrase');
    net.wrapped = { passphrase_wrap: next.passphraseWrap, recovery_wrap: setup.recoveryWrap };
    const { controller } = await pages();
    await controller.startSync();
    await wait(600);
    expect(JSON.parse(localStorage.getItem('proairetosVault')!).account.passphrase).toEqual(JSON.parse(JSON.stringify(next.passphraseWrap)));
  });
});
