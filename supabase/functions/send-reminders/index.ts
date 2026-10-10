// Sends due reminders as pushes. Each reminder's words were sealed on the device
// with the account key; they ride along unread, and the phone opens them. Rows
// without sealed words (older apps) still send an empty push, and the phone
// shows what it stored itself.
//
// Runs on a schedule (see docs/SERVER_SETUP.md). Requires secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com)
//   CRON_SECRET (shared with the cron job, so only it can call this)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Secrets pasted on a phone often carry a space, a newline or quotes; tidy them.
const secret = (name: string) => (Deno.env.get(name) ?? '').trim().replace(/^["']|["']$/g, '');

/** Sets the reminder keys, or says plainly which one is missing or wrong. */
function vapidProblem(): string | null {
  const subject = secret('VAPID_SUBJECT');
  const publicKey = secret('VAPID_PUBLIC_KEY');
  const privateKey = secret('VAPID_PRIVATE_KEY');
  if (!subject) return 'VAPID_SUBJECT is not set (for example mailto:you@example.com).';
  if (!/^(mailto:|https:)/.test(subject)) return 'VAPID_SUBJECT must start with mailto: or https:';
  if (!publicKey) return 'VAPID_PUBLIC_KEY is not set.';
  if (!privateKey) return 'VAPID_PRIVATE_KEY is not set.';
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return null;
  } catch (cause) {
    return `The VAPID keys were not accepted: ${cause instanceof Error ? cause.message : String(cause)}`;
  }
}

// Late reminders older than this are dropped rather than sent hours later.
const STALE_AFTER_MINUTES = 60;

async function handle(request: Request): Promise<Response> {
  if (!secret('CRON_SECRET') || (request.headers.get('x-cron-secret') ?? '').trim() !== secret('CRON_SECRET')) {
    return new Response('Not allowed: the cron secret does not match CRON_SECRET.', { status: 401 });
  }
  const problem = vapidProblem();
  if (problem) return new Response(problem, { status: 500 });

  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_AFTER_MINUTES * 60_000).toISOString();

  const dueRows = (columns: string) =>
    supabase
      .from('reminders')
      .select(columns)
      .is('sent_at', null)
      .lte('fire_at', now.toISOString())
      .gte('fire_at', staleBefore)
      .limit(500);
  type Row = { user_id: string; id: string; sealed?: string | null };
  type Result = { data: Row[] | null; error: { message: string } | null };
  let { data: due, error } = (await dueRows('user_id, id, sealed')) as unknown as Result;
  // Before the reminder-sources migration there is no sealed column: send empty pushes as before.
  if (error) ({ data: due, error } = (await dueRows('user_id, id')) as unknown as Result);
  if (error) return new Response(error.message, { status: 500 });

  // One push per person per run, however many reminders are due.
  const people = [...new Set((due ?? []).map((row) => row.user_id))];
  let sent = 0;

  for (const userId of people) {
    // Sealed words for this person's due reminders, newest first, kept well under a push's size limit.
    const sealed: string[] = [];
    let size = 0;
    for (const row of [...(due ?? [])].reverse()) {
      if (row.user_id !== userId || !row.sealed) continue;
      if (size + row.sealed.length > 3000) break;
      sealed.push(row.sealed);
      size += row.sealed.length + 3;
    }
    const payload = sealed.length > 0 ? JSON.stringify({ v: 1, n: sealed }) : null;
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload, // sealed words only: nothing the server can read
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
}

Deno.serve(async (request) => {
  try {
    return await handle(request);
  } catch (cause) {
    // Said in the reply, so it shows in net._http_response without opening the logs.
    return new Response(`send-reminders: ${cause instanceof Error ? cause.message : String(cause)}`, { status: 500 });
  }
});
