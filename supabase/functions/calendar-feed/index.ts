// Serves a person's calendar feed to calendar apps that subscribe to it.
// Calendar apps cannot sign in, so this is deployed without JWT checks and
// looks the feed up by the long random token in the link.
//
// Deploy: supabase functions deploy calendar-feed --no-verify-jwt
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const TOKEN = /^[A-Za-z0-9_-]{32,100}$/;

Deno.serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Not allowed', { status: 405 });

  // The token may come as ?token=… or as the last path part (optionally ending in .ics).
  const url = new URL(request.url);
  const fromPath = url.pathname.split('/').pop()?.replace(/\.ics$/, '') ?? '';
  const token = url.searchParams.get('token') ?? fromPath;
  if (!TOKEN.test(token)) return new Response('Not found', { status: 404 });

  const { data, error } = await supabase.from('calendar_feeds').select('ics').eq('token', token).maybeSingle();
  if (error) return new Response('Try again later', { status: 503 });
  if (!data) return new Response('Not found', { status: 404 });

  return new Response(request.method === 'HEAD' ? null : data.ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="proairetos.ics"',
      'cache-control': 'private, max-age=900',
      'x-robots-tag': 'noindex',
    },
  });
});
