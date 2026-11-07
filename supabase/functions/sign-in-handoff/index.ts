// A fresh one-time sign-in for the person calling, so another app of the family can sign in as them without
// an email: Proairetos (signed in) asks for it and puts it in a pass the person pastes into the other app.
// The other app gets its own session; nothing of this session is shared.
//
// Deploy: supabase functions deploy sign-in-handoff
// (JWT verification stays on: only a signed-in person can call it, for themselves.)

import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return new Response('Not allowed', { status: 405, headers: cors });

  const jwt = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user?.email) return new Response('Not signed in', { status: 401, headers: cors });

  // Makes the link without sending any email; only its token is returned, to this person.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: data.user.email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return new Response('Could not make a sign-in. Try again.', { status: 500, headers: cors });

  return new Response(JSON.stringify({ token_hash: tokenHash }), { headers: { ...cors, 'content-type': 'application/json' } });
});
