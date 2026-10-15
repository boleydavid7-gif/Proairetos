import { handleCaptureRequest, sealForInbox } from '../../../worker/capture';
import { resetRateLimit } from '../../../worker/safeFetch';
import { openSealed } from '../../app/capture/inbox';

async function pair() {
  const keys = (await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  )) as CryptoKeyPair;
  return { publicJwk: await crypto.subtle.exportKey('jwk', keys.publicKey), privateJwk: await crypto.subtle.exportKey('jwk', keys.privateKey) };
}

describe('capture from anywhere', () => {
  beforeEach(() => resetRateLimit());

  it('seals on arrival with the public key; only the device key opens it', async () => {
    const mine = await pair();
    const someoneElse = await pair();
    const words = { t: 'Call the dentist\nabout Friday', at: '2026-10-15T08:00:00Z' };
    const sealed = await sealForInbox(mine.publicJwk, words);
    expect(sealed).not.toContain('dentist');
    expect(await openSealed(mine.privateJwk, sealed)).toEqual(words);
    await expect(openSealed(someoneElse.privateJwk, sealed)).rejects.toThrow();
    // RSA keys take a moment to make, more so with every test file running at once.
  }, 30_000);

  it('keeps only sealed words, and says when the token is unknown', async () => {
    const { publicJwk } = await pair();
    const calls: { name: string; body: Record<string, string> }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      const name = url.split('/').pop()!;
      const body = JSON.parse(String(init.body)) as Record<string, string>;
      calls.push({ name, body });
      if (name === 'inbox_key') return new Response(JSON.stringify(body.token === 'a-good-token-of-enough-length' ? publicJwk : null));
      return new Response('true');
    }) as unknown as typeof fetch;
    const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' };
    const post = (body: unknown) => new Request('https://proairetos.com/api/capture', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

    const ok = await handleCaptureRequest(post({ token: 'a-good-token-of-enough-length', text: 'Buy oat milk' }), env, fake);
    expect(await ok.json()).toEqual({ ok: true, said: 'Captured' });
    const kept = calls.find((call) => call.name === 'inbox_add')!;
    expect(kept.body.sealed).not.toContain('oat');

    expect((await handleCaptureRequest(post({ token: 'an-unknown-token-of-enough-length', text: 'x' }), env, fake)).status).toBe(404);
    expect((await handleCaptureRequest(post({ token: 'a-good-token-of-enough-length', text: '  ' }), env, fake)).status).toBe(400);
    expect((await handleCaptureRequest(post({ token: 'a-good-token-of-enough-length', text: 'x' }), {}, fake)).status).toBe(503);
  }, 30_000);
});
