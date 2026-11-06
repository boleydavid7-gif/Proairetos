// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * A missing session means two different things: the session is over, or it could not be checked (an expired token and no
 * connection: the client cannot refresh, reports no session and keeps the stored one). Only the first may make a device
 * forget its key. A fake client stands in for Supabase so both can be tried at once, without the client's real 30 second
 * retry while offline.
 */
vi.stubEnv('VITE_SUPABASE_URL', 'https://stub.test');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');

const client = vi.hoisted(() => ({ result: { data: { session: null as unknown }, error: null as unknown } }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => client.result,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
  }),
}));

class Unreachable extends Error {
  name = 'AuthRetryableFetchError';
}

const user = { id: 'u1', email: 'a@b.test' };

async function keyStored() {
  const { deviceDatabase } = await import('../../app/services');
  const { createIndexedDbSyncStateStore } = await import('../../data/sync/localStores');
  const state = createIndexedDbSyncStateStore(Promise.resolve((await deviceDatabase)!));
  await state.clear();
  await state.setMeta('dataKey', await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
  return state;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('whether a missing session means it is over', () => {
  it('reads a session as present', async () => {
    client.result = { data: { session: { user } }, error: null };
    const { checkSession } = await import('../../data/sync/supabase');
    expect(await checkSession()).toEqual({ user, ended: false });
  });

  it('reads no session and no error as over', async () => {
    client.result = { data: { session: null }, error: null };
    const { checkSession } = await import('../../data/sync/supabase');
    expect(await checkSession()).toEqual({ user: null, ended: true });
  });

  it('reads a refused refresh as over', async () => {
    client.result = { data: { session: null }, error: Object.assign(new Error('Invalid Refresh Token'), { name: 'AuthApiError', status: 400 }) };
    const { checkSession } = await import('../../data/sync/supabase');
    expect((await checkSession()).ended).toBe(true);
  });

  it('reads an unreachable server as not over', async () => {
    client.result = { data: { session: null }, error: new Unreachable('Failed to fetch') };
    const { checkSession } = await import('../../data/sync/supabase');
    expect(await checkSession()).toEqual({ user: null, ended: false });
  });
});

describe('what a device keeps', () => {
  it('forgets its key when the session is over', async () => {
    const state = await keyStored();
    client.result = { data: { session: null }, error: null };
    const controller = await import('../../app/sync/syncController');
    await controller.startSync();
    expect(controller.syncStatus.get().phase).toBe('signed-out');
    expect(await state.getMeta('dataKey')).toBeUndefined();
  });

  it('keeps its key when the server could not be reached', async () => {
    const state = await keyStored();
    client.result = { data: { session: null }, error: new Unreachable('Failed to fetch') };
    const controller = await import('../../app/sync/syncController');
    await controller.startSync();
    expect(await state.getMeta('dataKey')).toBeDefined();
  });
});
