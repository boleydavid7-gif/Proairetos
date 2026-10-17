// Sends due reminders as pushes. Each reminder's words were sealed on the device
// with the account key; they ride along unread, and the phone opens them. Rows
// without sealed words (older apps) still send an empty push, and the phone
// shows what it stored itself.
//
// Runs on a schedule (see docs/SERVER_SETUP.md). Requires secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com)
//   CRON_SECRET (shared with the cron job, so only it can call this)
// Optional: SITE_URL (default https://proairetos.com), where a tap goes on a phone that shows the push itself.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// Each push is also a Declarative Web Push (Safari 18.4 and later). When lock-screen details are enabled, the
// preview fields carry the same title and line the service worker would show; otherwise the phone gets only a
// generic line. Other browsers ignore that part.

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

const APP_NAMES: Record<string, string> = {
  proairetos: 'Proairetos', askesis: 'Askesis', oikonomia: 'Oikonomia', hydros: 'Hydros', praxis: 'Praxis', diaita: 'Diaita',
  philia: 'Philia', ergon: 'Ergon', therapeia: 'Therapeia', dynamis: 'Dynamis', ktema: 'Ktema', phyton: 'Phyton',
};

/** The part an iPhone can show by itself: the app's name, a plain line, and where a tap goes. Nothing personal. */
function iconFor(source: string, site: string): string {
  const app = APP_NAMES[source] ? source : 'proairetos';
  return `${site}${app === 'proairetos' ? '/icons/icon-192.png' : `/${app}/icons/icon-192.png`}`;
}

function declarative(source: string, preview?: { title?: string | null; body?: string | null; open?: string | null }) {
  const site = (secret('SITE_URL') || 'https://proairetos.com').replace(/\/+$/, '');
  const app = APP_NAMES[source] ? source : 'proairetos';
  const body = preview?.title ? [preview.title, preview.body].filter(Boolean).join(' · ') : 'You have a reminder.';
  const navigate = preview?.open && app === 'proairetos' ? `${site}/?open=${encodeURIComponent(preview.open)}` : app === 'proairetos' ? `${site}/` : `${site}/${app}/`;
  return {
    web_push: 8030,
    notification: {
      title: APP_NAMES[app],
      body,
      icon: iconFor(source, site),
      badge: `${site}/icons/icon-192.png`,
      navigate,
      lang: 'en',
    },
    mutable: true,
  };
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
  type Row = { user_id: string; id: string; sealed?: string | null; source?: string | null; preview_title?: string | null; preview_body?: string | null; preview_open?: string | null };
  type Result = { data: Row[] | null; error: { message: string } | null };
  let { data: due, error } = (await dueRows('user_id, id, sealed, source, preview_title, preview_body, preview_open')) as unknown as Result;
  // Before the preview migration: sealed words and sources still go out, so the phone shows each app's own words.
  if (error) ({ data: due, error } = (await dueRows('user_id, id, sealed, source')) as unknown as Result);
  // Before the reminder-sources migration there is no sealed/source column: plain pushes as before.
  if (error) ({ data: due, error } = (await dueRows('user_id, id')) as unknown as Result);
  if (error) return new Response(error.message, { status: 500 });

  // One push per person per run, however many reminders are due.
  const people = [...new Set((due ?? []).map((row) => row.user_id))];
  let sent = 0;
  // Each push the service refused, with its answer, so the reply in net._http_response says why nothing arrived.
  const refused: { service: string; status?: number; answer: string }[] = [];

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
    const mine = (due ?? []).filter((row) => row.user_id === userId);
    // Labeled by a row that has an app of its own rather than Proairetos's catch-all, so a push for Ergon or Therapeia
    // carries that app's name and icon even when the phone shows the push itself.
    const first = mine.find((row) => row.source && row.source !== 'proairetos') ?? mine[0];
    const declarativeRow = mine.find((row) => row.preview_title) ?? first;
    const source = declarativeRow?.source ?? 'proairetos';
    const preview = declarativeRow?.preview_title ? declarativeRow : undefined;
    const payload = JSON.stringify({ ...declarative(source, preview), v: 1, n: sealed });
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload, // the app's name, sealed words, and an opt-in lock-screen preview
          // High: a reminder is time-bound, and at normal urgency Android's Doze and an iPhone in Low Power Mode may
          // hold a push back for many minutes.
          { TTL: 3600, urgency: 'high' },
        );
        sent++;
      } catch (cause) {
        const status = (cause as { statusCode?: number }).statusCode;
        const answer = (cause as { body?: string }).body ?? (cause instanceof Error ? cause.message : String(cause));
        refused.push({ service: new URL(sub.endpoint).host, status, answer: String(answer).slice(0, 200) });
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

  return Response.json({ due: due?.length ?? 0, people: people.length, sent, refused });
}

Deno.serve(async (request) => {
  try {
    return await handle(request);
  } catch (cause) {
    // Said in the reply, so it shows in net._http_response without opening the logs.
    return new Response(`send-reminders: ${cause instanceof Error ? cause.message : String(cause)}`, { status: 500 });
  }
});
