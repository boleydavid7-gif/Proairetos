// Deletes the signed-in person's account and everything stored with it.
// Every table references auth.users with "on delete cascade", so removing
// the user removes their encrypted records, keys, push addresses, reminder
// times, and calendar feed in one step. Files kept with items are removed from
// storage first. Other devices' sessions stop working,
// so nothing can be uploaded again afterwards.
//
// Deploy: supabase functions deploy delete-account
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
  if (error || !data.user) return new Response('Not signed in', { status: 401, headers: cors });

  // Files kept with items live in storage, which a cascade does not reach: clear them first.
  const folder = `${data.user.id}/attachments`;
  for (;;) {
    const { data: files } = await admin.storage.from('proairetos-files').list(folder, { limit: 100 });
    if (!files || files.length === 0) break;
    await admin.storage.from('proairetos-files').remove(files.map((file) => `${folder}/${file.name}`));
    if (files.length < 100) break;
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return new Response('Could not delete. Try again.', { status: 500, headers: cors });

  return new Response(JSON.stringify({ deleted: true }), { headers: { ...cors, 'content-type': 'application/json' } });
});
