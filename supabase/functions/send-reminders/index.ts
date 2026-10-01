// Sends due reminders as empty pushes. The phone shows a private message
// ("Something you chose is ready"); details stay end-to-end encrypted.
//
// Runs on a schedule (see docs/SERVER_SETUP.md). Requires secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com)
//   CRON_SECRET (shared with the cron job, so only it can call this)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

// Late reminders older than this are dropped rather than sent hours later.
const STALE_AFTER_MINUTES = 60;

Deno.serve(async (request) => {
  if (request.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Not allowed', { status: 401 });
  }

  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_AFTER_MINUTES * 60_000).toISOString();

  const { data: due, error } = await supabase
    .from('reminders')
    .select('user_id, id')
    .is('sent_at', null)
    .lte('fire_at', now.toISOString())
    .gte('fire_at', staleBefore)
    .limit(500);
  if (error) return new Response(error.message, { status: 500 });

  // One push per person per run, however many reminders are due.
  const people = [...new Set((due ?? []).map((row) => row.user_id))];
  let sent = 0;

  for (const userId of people) {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          null, // no payload: nothing readable leaves the server
          { TTL: 3600, urgency: 'normal' },
        );
        sent++;
      } catch (cause) {
        const status = (cause as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }
  }

  if (due && due.length > 0) {
    for (const row of due) {
      await supabase.from('reminders').update({ sent_at: now.toISOString() }).eq('user_id', row.user_id).eq('id', row.id);
    }
  }
  // Tidy up anything long past.
  await supabase.from('reminders').delete().lt('fire_at', new Date(now.getTime() - 7 * 86_400_000).toISOString());

  return Response.json({ due: due?.length ?? 0, people: people.length, sent });
});
