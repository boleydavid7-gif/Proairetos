// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Stage 1 of the session security work: what signing out, a session that ends elsewhere and a lost connection do to the
 * keys a page and a device hold. The real sync controller and the real Supabase client run over fake storage and a stub
 * network; a second copy of the controller (a fresh module graph) stands in for another tab or a companion app in the
 * same browser profile.
 */
vi.stubEnv('VITE_SUPABASE_URL', 'https://stub.test');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');

const net = vi.hoisted(() => ({ calls: [] as string[], online: true, serverEndedSession: false, deviceRevoked: false }));
const b64 = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = () => `${b64({ alg: 'HS256' })}.${b64({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })}.sig`;
const user = { id: 'u1', email: 'a@b.test', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    net.calls.push(`${init?.method ?? 'GET'} ${url.replace('https://stub.test', '')}`);
    if (!net.online) throw new TypeError('Failed to fetch');
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (url.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
    if (url.includes('/auth/v1/user')) return reply(user);
    if (url.includes('grant_type=refresh_token')) return net.serverEndedSession ? reply({ error: 'invalid_grant', error_description: 'Invalid Refresh Token' }, 400) : reply({ access_token: jwt(), refresh_token: 'r2', expires_in: 3600, token_type: 'bearer', user });
    if (url.includes('/rest/v1/account_devices') && (init?.method ?? 'GET') === 'GET') return reply(net.deviceRevoked ? { app_ids: [], revoked_at: '2026-11-06T00:00:00Z' } : null);
    if (url.includes('/rest/v1/')) return reply([]);
    return reply({});
  }) as typeof fetch;
});

const session = (expiresInSeconds = 3600) =>
  JSON.stringify({ access_token: jwt(), refresh_token: 'r1', expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds, expires_in: 3600, token_type: 'bearer', user });

async function seedSignedIn() {
  const { deviceDatabase } = await import('../../app/services');
  const { createIndexedDbSyncStateStore } = await import('../../data/sync/localStores');
  const state = createIndexedDbSyncStateStore(Promise.resolve((await deviceDatabase)!));
  await state.clear();
  await state.setMeta('dataKey', await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
  await state.setMeta('handoffKey', 'COPY-FOR-OTHER-APPS');
  localStorage.setItem('proairetos.auth', session());
  localStorage.setItem('proairetosAccount', 'u1');
  return state;
}

const bytes = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function open() {
  vi.resetModules();
  const controller = await import('../../app/sync/syncController');
  await controller.startSync();
  return controller;
}

beforeEach(() => {
  localStorage.clear();
  net.calls.length = 0;
  net.online = true;
  net.serverEndedSession = false;
  net.deviceRevoked = false;
});

describe('signing out', () => {
  it('leaves no key in the page that signed out, in another open page or in the database, and keeps the records', async () => {
    const state = await seedSignedIn();
    localStorage.setItem('proairetos.displayName', 'Sam');
    const first = await open();
    const sealed = await first.sealWithAccount('test', bytes('secret'));
    expect(sealed).not.toBeNull();
    const second = await open();
    expect(second.syncStatus.get().phase).toBe('ready');

    await first.signOut('local');
    await wait(400);

    expect(first.syncStatus.get().phase).toBe('signed-out');
    expect(second.syncStatus.get().phase).toBe('signed-out');
    // The other page can no longer open what was sealed with the key, nor seal anything new.
    expect(await second.openWithAccount('test', sealed!.sealed.buffer as ArrayBuffer)).toBeNull();
    expect(await second.sealWithAccount('test', bytes('x'))).toBeNull();
    expect(await state.getMeta('dataKey')).toBeUndefined();
    expect(await state.getMeta('handoffKey')).toBeUndefined();
    expect(localStorage.getItem('proairetos.auth')).toBeNull();
    // Nothing the person owns is removed.
    expect(localStorage.getItem('proairetos.displayName')).toBe('Sam');
  });

  it('this device only ends this browser’s session and leaves the account’s waiting reminders; everywhere ends them all', async () => {
    await seedSignedIn();
    const local = await open();
    await local.signOut('local');
    expect(net.calls.some((call) => call.includes('/auth/v1/logout?scope=local'))).toBe(true);
    expect(net.calls.some((call) => call.includes('/auth/v1/logout?scope=global'))).toBe(false);
    expect(net.calls.some((call) => call.startsWith('DELETE /rest/v1/reminders'))).toBe(false);

    net.calls.length = 0;
    await seedSignedIn();
    const everywhere = await open();
    await everywhere.signOut('global');
    expect(net.calls.some((call) => call.includes('/auth/v1/logout?scope=global'))).toBe(true);
    expect(net.calls.some((call) => call.startsWith('DELETE /rest/v1/reminders'))).toBe(true);
  });

  it('with no connection it still signs the device out, drops the local session and keys, and says the server session is still active', async () => {
    const state = await seedSignedIn();
    const controller = await open();
    net.online = false;
    const result = await controller.signOut('local');
    expect(result.endedOnServer).toBe(false);
    expect(controller.syncStatus.get().phase).toBe('signed-out');
    expect(controller.syncStatus.get().error).toMatch(/session there is still active/);
    expect(localStorage.getItem('proairetos.auth')).toBeNull();
    expect(await state.getMeta('dataKey')).toBeUndefined();
  });

  it('reports nothing when the server ended the session', async () => {
    await seedSignedIn();
    const controller = await open();
    const result = await controller.signOut('local');
    expect(result.endedOnServer).toBe(true);
    expect(controller.syncStatus.get().error).toBeUndefined();
  });
});

describe('a session that ends without a sign-out on this device', () => {
  it('removes the stored key, so signing in again does not open the data on its own', async () => {
    const state = await seedSignedIn();
    const controller = await open();
    expect(controller.syncStatus.get().phase).toBe('ready');
    // Another device signed out everywhere: the access token here has run out and the refresh is refused.
    net.serverEndedSession = true;
    localStorage.setItem('proairetos.auth', session(-10));
    const { supabase } = await import('../../data/sync/supabase');
    await (await supabase()).auth.getSession();
    await wait(500);
    expect(controller.syncStatus.get().phase).toBe('signed-out');
    expect(await state.getMeta('dataKey')).toBeUndefined();
    expect(await state.getMeta('handoffKey')).toBeUndefined();

    net.serverEndedSession = false;
    await (await supabase()).auth.setSession({ access_token: jwt(), refresh_token: 'r2' });
    await wait(600);
    expect(controller.syncStatus.get().phase).not.toBe('ready');
  });

  it('a device revoked from the account drops its keys', async () => {
    const state = await seedSignedIn();
    net.deviceRevoked = true;
    const controller = await open();
    await wait(300);
    expect(controller.syncStatus.get().phase).toBe('signed-out');
    expect(await state.getMeta('dataKey')).toBeUndefined();
    expect(await controller.openWithAccount('test', bytes('x'))).toBeNull();
  });
});

describe('the sync state store', () => {
  it('removes one value and leaves the others, in memory and in the database', async () => {
    const { createMemorySyncStateStore, createIndexedDbSyncStateStore } = await import('../../data/sync/localStores');
    const { deviceDatabase } = await import('../../app/services');
    for (const store of [createMemorySyncStateStore(), createIndexedDbSyncStateStore(Promise.resolve((await deviceDatabase)!))]) {
      await store.clear();
      await store.setMeta('a', 1);
      await store.setMeta('b', 2);
      await store.removeMeta('a');
      expect(await store.getMeta('a')).toBeUndefined();
      expect(await store.getMeta('b')).toBe(2);
    }
  });
});
