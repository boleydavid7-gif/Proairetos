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
// Deploy: supabase functions deploy passkey-sign-in --no-verify-jwt
// (called before anyone is signed in; it trusts nothing but the passkey's signature.)

import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkAssertion, fromBase64Url } from '../_shared/webauthn.ts';

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
