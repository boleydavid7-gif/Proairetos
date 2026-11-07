import { handleHealthRequest } from '../../../worker/health';
import { resetRateLimit } from '../../../worker/safeFetch';
import { openSealed } from '../../app/capture/inbox';
import type { HealthBatch } from '../../core/health/autoExport';

describe('Apple Health address', () => {
  beforeEach(() => resetRateLimit());

  it('keeps only what the apps use, sealed for the device', async () => {
    const keys = (await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['encrypt', 'decrypt'],
    )) as CryptoKeyPair;
    const publicJwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
    const privateJwk = await crypto.subtle.exportKey('jwk', keys.privateKey);
    const kept: string[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      const name = url.split('/').pop()!;
      const body = JSON.parse(String(init.body)) as Record<string, string>;
      if (name === 'health_inbox_key') return new Response(JSON.stringify(body.token === 'a-good-token-of-enough-length' ? publicJwk : null));
      kept.push(body.sealed);
      return new Response('true');
    }) as unknown as typeof fetch;
    const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' };
    const post = (body: unknown) => new Request('https://proairetos.com/api/health/x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } });
    const sent = { data: { metrics: [{ name: 'weight_body_mass', units: 'kg', data: [{ date: '2026-10-22 07:01:00 +0100', qty: 72.5 }] }, { name: 'step_count', data: [{ date: '2026-10-22 00:00:00 +0100', qty: 9000 }] }] } };

    const ok = await handleHealthRequest(post(sent), env, 'a-good-token-of-enough-length', fake);
    expect(await ok.json()).toEqual({ ok: true, kept: 1 });
    expect(kept).toHaveLength(1);
    expect(kept[0]).not.toContain('72.5');
    const opened = await openSealed<HealthBatch>(privateJwk, kept[0], 'proairetos-health');
    expect(opened.readings).toEqual([{ id: 'weight-2026-10-22T07:01', kind: 'weight', at: '2026-10-22T06:01:00.000Z', value: 72.5, unit: 'kg' }]);

    expect((await handleHealthRequest(post(sent), env, 'an-unknown-token-of-enough-length', fake)).status).toBe(404);
    expect((await handleHealthRequest(post('not json'), env, 'a-good-token-of-enough-length', fake)).status).toBe(400);
    expect((await handleHealthRequest(post(sent), {}, 'a-good-token-of-enough-length', fake)).status).toBe(503);
  }, 30_000);
});
