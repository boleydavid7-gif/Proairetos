import { tooOften } from './safeFetch';

/*
 * Capture from anywhere: a Shortcut on the person's phone (Siri, Back Tap, Apple Watch) posts { token, text } here.
 * The words are sealed at once with the public key the person's own device made (RSA-OAEP over a fresh AES-GCM key),
 * and only the sealed words are kept, in the person's inbox. Proairetos opens them on the device. Nothing is logged.
 * Needs the project's public address and publishable key as Worker variables (SUPABASE_URL, SUPABASE_ANON_KEY).
 */

export type CaptureEnv = { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };

const MAX_TEXT = 4000;

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

const base64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

/** The words sealed for the holder of the private key: { v, k (wrapped AES key), iv, c }, as base64 JSON. */
export async function sealForInbox(publicJwk: JsonWebKey, words: { t: string; at: string }): Promise<string> {
  const publicKey = await crypto.subtle.importKey('jwk', publicJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('proairetos-capture') }, aes, new TextEncoder().encode(JSON.stringify(words)));
  const k = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, await crypto.subtle.exportKey('raw', aes));
  return btoa(JSON.stringify({ v: 1, k: base64(k), iv: base64(iv), c: base64(c) }));
}

async function readBody(request: Request): Promise<{ token?: string; text?: string }> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return (await request.json().catch(() => ({}))) as { token?: string; text?: string };
  const form = await request.formData().catch(() => null);
  if (form) return { token: String(form.get('token') ?? ''), text: String(form.get('text') ?? '') };
  return {};
}

export async function handleCaptureRequest(request: Request, env: CaptureEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return reply(405, { error: 'Not allowed' });
  const base = env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = env.SUPABASE_ANON_KEY?.trim();
  if (!base || !key) return reply(503, { error: 'Capture from anywhere is not set up yet.' });
  if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });

  const { token, text } = await readBody(request);
  const words = typeof text === 'string' ? text.trim().slice(0, MAX_TEXT) : '';
  if (typeof token !== 'string' || token.length < 20 || token.length > 200 || !words) return reply(400, { error: 'Send a token and some words.' });

  const rpc = (name: string, args: Record<string, string>) =>
    fetchImpl(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
  try {
    const found = await rpc('inbox_key', { token });
    const publicJwk = found.ok ? ((await found.json()) as JsonWebKey | null) : null;
    if (!publicJwk) return reply(404, { error: 'That inbox was not found. Copy the token again from Proairetos.' });
    const sealed = await sealForInbox(publicJwk, { t: words, at: new Date().toISOString() });
    const kept = await rpc('inbox_add', { token, sealed });
    if (!kept.ok || (await kept.json()) !== true) return reply(409, { error: 'The inbox is full. Open Proairetos to empty it.' });
    return reply(200, { ok: true, said: 'Captured' });
  } catch {
    return reply(502, { error: 'The inbox could not be reached. Try again.' });
  }
}
