// Signing in with a passkey, from any app of the family (each iPhone Home Screen app keeps its own storage).
//
//   { step: 'begin' }  -> { challenge }               a one-time challenge, good for two minutes
//   { step: 'finish', credentialId, clientDataJSON, authenticatorData, signature }
//                      -> { token_hash, wrap }         a fresh one-time sign-in for that person (no email sent),
//                                                      and their data key as that passkey sealed it (or null)
//
// The passkey's public key was saved by the person, signed in, when they added it (table `passkeys`). The sealed
// data key opens only with the passkey's own secret on the device (WebAuthn PRF); the server never sees it.
//
// Deploy: supabase functions deploy passkey-sign-in --no-verify-jwt, or paste this one file into the dashboard editor
// with Verify JWT off (called before anyone is signed in; it trusts nothing but the passkey's signature).
// The signature check below is a copy of supabase/functions/_shared/webauthn.ts, so this file deploys alone; a test
// keeps the two the same.

import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
const refuse = () => reply({ error: 'That passkey did not sign in. Try again, or sign in by email.' }, 401);

function randomChallenge(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return new Response('Not allowed', { status: 405, headers: cors });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return reply({ error: 'Bad request' }, 400);
  }

  if (body.step === 'begin') {
    await admin.from('passkey_challenges').delete().lt('expires_at', new Date().toISOString());
    const challenge = randomChallenge();
    const { error } = await admin.from('passkey_challenges').insert({ challenge });
    if (error) return reply({ error: 'Passkeys are not set up on the server yet.' }, 500);
    return reply({ challenge });
  }

  if (body.step !== 'finish') return reply({ error: 'Bad request' }, 400);
  const { credentialId, clientDataJSON, authenticatorData, signature } = body;
  if ([credentialId, clientDataJSON, authenticatorData, signature].some((value) => typeof value !== 'string' || value.length > 8000)) {
    return reply({ error: 'Bad request' }, 400);
  }

  // The challenge the browser signed, taken once.
  let challenge: string;
  try {
    const client = JSON.parse(new TextDecoder().decode(fromBase64Url(String(clientDataJSON))));
    challenge = String(client.challenge ?? '');
  } catch {
    return refuse();
  }
  const { data: taken } = await admin
    .from('passkey_challenges')
    .delete()
    .eq('challenge', challenge)
    .gte('expires_at', new Date().toISOString())
    .select('challenge');
  if (!taken?.length) return refuse();

  const { data: passkey } = await admin
    .from('passkeys')
    .select('user_id, public_key, algorithm, rp_id, wrap')
    .eq('credential_id', credentialId)
    .maybeSingle();
  if (!passkey) return refuse();

  const problem = await checkAssertion(
    { clientDataJSON: String(clientDataJSON), authenticatorData: String(authenticatorData), signature: String(signature) },
    { publicKey: passkey.public_key, algorithm: passkey.algorithm, rpId: passkey.rp_id },
    challenge,
  );
  if (problem) {
    console.log('passkey refused:', problem);
    return refuse();
  }

  const { data: found } = await admin.auth.admin.getUserById(passkey.user_id);
  const email = found?.user?.email;
  if (!email) return refuse();
  // Makes the sign-in without sending any email; only its token goes back, to the holder of the passkey.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return reply({ error: 'Could not make a sign-in. Try again.' }, 500);

  await admin.from('passkeys').update({ last_used_at: new Date().toISOString() }).eq('credential_id', credentialId);
  return reply({ token_hash: tokenHash, wrap: passkey.wrap ?? null });
});

// ---- Copy of supabase/functions/_shared/webauthn.ts (kept the same by a test) ----

export type StoredPasskey = {
  /** SubjectPublicKeyInfo (DER), base64url, as the browser gave it at registration. */
  publicKey: string;
  /** COSE algorithm: -7 ES256, -257 RS256. */
  algorithm: number;
  /** The site the passkey was made for ("proairetos.com"). */
  rpId: string;
};

export type Assertion = {
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
};

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export function toBase64Url(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);

/** An ECDSA signature arrives DER-encoded; Web Crypto wants r and s side by side, 32 bytes each. */
export function derToRaw(der: Uint8Array): Uint8Array<ArrayBuffer> {
  if (der[0] !== 0x30) throw new Error('signature');
  let at = 2;
  if (der[1] & 0x80) at = 2 + (der[1] & 0x7f);
  const part = () => {
    if (der[at] !== 0x02) throw new Error('signature');
    const length = der[at + 1];
    let value = der.slice(at + 2, at + 2 + length);
    at += 2 + length;
    while (value.length > 32 && value[0] === 0) value = value.slice(1);
    if (value.length > 32) throw new Error('signature');
    const out = new Uint8Array(32);
    out.set(value, 32 - value.length);
    return out;
  };
  const r = part();
  const s = part();
  const raw = new Uint8Array(64);
  raw.set(r, 0);
  raw.set(s, 32);
  return raw;
}

/** The origins a passkey for this site may answer from: the site itself, or a local test server. */
function originFits(origin: string, rpId: string): boolean {
  try {
    const url = new URL(origin);
    if (url.hostname !== rpId && !url.hostname.endsWith(`.${rpId}`)) return false;
    return url.protocol === 'https:' || url.hostname === 'localhost';
  } catch {
    return false;
  }
}

/**
 * Whether the assertion answers this challenge, for this site, signed by this passkey, with the person verified.
 * Returns the reason when it does not ("" when it does), so the function can log it without telling a caller why.
 */
export async function checkAssertion(assertion: Assertion, passkey: StoredPasskey, challenge: string): Promise<string> {
  let client: { type?: string; challenge?: string; origin?: string };
  const clientBytes = fromBase64Url(assertion.clientDataJSON);
  try {
    client = JSON.parse(new TextDecoder().decode(clientBytes));
  } catch {
    return 'client data';
  }
  if (client.type !== 'webauthn.get') return 'type';
  if (client.challenge !== challenge) return 'challenge';
  if (!client.origin || !originFits(client.origin, passkey.rpId)) return 'origin';

  const auth = fromBase64Url(assertion.authenticatorData);
  if (auth.length < 37) return 'authenticator data';
  const rpHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passkey.rpId)));
  if (!same(auth.slice(0, 32), rpHash)) return 'site';
  const flags = auth[32];
  if (!(flags & 0x01)) return 'not present';
  if (!(flags & 0x04)) return 'not verified';

  const clientHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientBytes));
  const signed = new Uint8Array(auth.length + clientHash.length);
  signed.set(auth, 0);
  signed.set(clientHash, auth.length);
  const signature = fromBase64Url(assertion.signature);
  const spki = fromBase64Url(passkey.publicKey);
  try {
    if (passkey.algorithm === -7) {
      const key = await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      return (await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(signature), signed)) ? '' : 'signature';
    }
    if (passkey.algorithm === -257) {
      const key = await crypto.subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
      return (await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed)) ? '' : 'signature';
    }
  } catch {
    return 'key';
  }
  return 'algorithm';
}
// ---- End of copy ----
