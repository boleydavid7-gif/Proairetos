import { readHealthExport, splitBatch, batchSize } from '../src/core/health/autoExport';
import { sealForInbox, type CaptureEnv } from './capture';
import { tooOften } from './safeFetch';

/*
 * Apple Health, sent by Health Auto Export's REST API automation to /api/health/<token>. Only what the family's apps
 * keep is read out of the export (core/health/autoExport.ts); it is sealed at once with the public key the person's
 * own device made, kept in their health inbox, and opened by their apps. The rest of the export is dropped unread
 * and nothing is logged.
 */

const MAX_BYTES = 30 * 1024 * 1024;

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

async function readLimited(request: Request): Promise<string | undefined> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return undefined;
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const part of parts) {
    all.set(part, at);
    at += part.byteLength;
  }
  return new TextDecoder().decode(all);
}

export async function handleHealthRequest(request: Request, env: CaptureEnv, token: string, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return reply(405, { error: 'Send the export with POST.' });
  const base = env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = env.SUPABASE_ANON_KEY?.trim();
  if (!base || !key) return reply(503, { error: 'Apple Health is not set up on this server yet.' });
  if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });
  if (token.length < 20 || token.length > 200) return reply(404, { error: 'That address was not found. Copy it again from Proairetos.' });

  const text = await readLimited(request);
  if (text === undefined) return reply(413, { error: 'The export is too large. Send less at a time.' });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return reply(400, { error: 'Send the export as JSON.' });
  }
  const batch = readHealthExport(json);
  if (!batchSize(batch)) return reply(200, { ok: true, kept: 0 });

  const rpc = (name: string, args: Record<string, string>) =>
    fetchImpl(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
  try {
    const found = await rpc('health_inbox_key', { token });
    // The account server's own answer when it is not a plain yes, so a setup problem can be told from a wrong address.
    if (!found.ok) return reply(found.status === 404 ? 503 : 502, { error: 'The account server refused the lookup.', status: found.status, detail: (await found.text()).slice(0, 200) });
    const publicJwk = (await found.json()) as JsonWebKey | null;
    if (!publicJwk) return reply(404, { error: 'That address was not found. Copy it again from Proairetos.' });
    for (const part of splitBatch(batch)) {
      const sealed = await sealForInbox(publicJwk, part, 'proairetos-health');
      const kept = await rpc('health_inbox_add', { token, sealed });
      if (!kept.ok || (await kept.json()) !== true) return reply(409, { error: 'Too much is waiting. Open one of your apps to bring it in.' });
    }
    return reply(200, { ok: true, kept: batchSize(batch) });
  } catch (cause) {
    return reply(502, { error: 'The inbox could not be reached. Try again.', detail: cause instanceof Error ? cause.message.slice(0, 200) : undefined });
  }
}
