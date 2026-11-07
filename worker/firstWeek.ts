/*
 * Three short emails in a new account's first week, sent once a day by the Worker's schedule (wrangler.jsonc
 * `triggers.crons`) through Resend: getting started (day 1), planning around a week (day 3) and the free trial's end
 * (day 6, only when nothing has been bought). Each is sent once (`first_week_emails`), and a signed link stops them for
 * good (`email_stops`, migration 20261102000000_first_week_emails.sql). Only the address and the sign-up date are
 * read; nothing in the person's apps is.
 *
 * Secrets: RESEND_API_KEY, EMAIL_SIGNING_SECRET, SUPABASE_SERVICE_ROLE_KEY. Optional var EMAIL_FROM (default
 * "Proairetos <hello@proairetos.com>", a domain verified in Resend).
 */
import { TRIAL_DAYS, trialUntil } from './store';

export type FirstWeekEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_SIGNING_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  OWNER_EMAIL?: string;
};

type Fetcher = typeof fetch;
export type Step = 'start' | 'week' | 'ending';
type Account = { id: string; email: string; createdAt: string };

const SITE = 'https://proairetos.com';
const DAY = 86_400_000;

export const firstWeekReady = (env: FirstWeekEnv) =>
  Boolean(env.RESEND_API_KEY && env.EMAIL_SIGNING_SECRET && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

/** Which email an account is due on its nth day; each has two days so a missed run still sends it. */
export function stepFor(createdAt: string, now = Date.now()): Step | undefined {
  const age = Math.floor((now - Date.parse(createdAt)) / DAY);
  if (age === 0 || age === 1) return 'start';
  if (age === 2 || age === 3) return 'week';
  if (age === TRIAL_DAYS - 2 || age === TRIAL_DAYS - 1) return 'ending';
  return undefined;
}

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** The stop link's signature: HMAC-SHA256 of the account id, so nobody can stop someone else's emails. */
export async function stopSignature(userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`stop:${userId}`))).slice(0, 40);
}

export const stopLink = async (userId: string, secret: string) =>
  `${SITE}/api/emails/stop?u=${encodeURIComponent(userId)}&t=${await stopSignature(userId, secret)}`;

const dayText = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

/** The words of each email, plain text; the HTML is made from them. */
export function emailText(step: Step, until: string): { subject: string; text: string } {
  if (step === 'start') {
    return {
      subject: 'Getting started with Proairetos',
      text: [
        'Three things for your first week:',
        `1. Add Proairetos to your Home Screen, so reminders arrive with the app closed: ${SITE}/welcome/#install`,
        '2. Write things the way you’d say them. “Dentist Friday 3pm” lands on Friday at 3 with a reminder.',
        `3. Every app is yours to try until ${dayText(until)}. See them all in the Store: ${SITE}/?open=settings:store`,
        'Questions or ideas: reply to this email.',
      ].join('\n\n'),
    };
  }
  if (step === 'week') {
    return {
      subject: 'Plan around your real week',
      text: [
        'If your days follow a pattern (work, study, care, a rotation), add it once in Settings › Your days › Schedule. Today, Days ahead and your reminders follow it from then on.',
        `See your week: ${SITE}/?open=day:today`,
        'Questions or ideas: reply to this email.',
      ].join('\n\n'),
    };
  }
  return {
    subject: `Your free trial ends ${dayText(until).split(',')[0]}`,
    text: [
      `Your trial of every app ends on ${dayText(until)}. Proairetos itself stays free.`,
      `To keep an app after that, choose a plan in the Store: ${SITE}/?open=settings:store`,
      'Nothing you’ve written is removed either way.',
      'Questions or ideas: reply to this email.',
    ].join('\n\n'),
  };
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const linked = (text: string) => escape(text).replace(/https:\/\/[^\s<]+/g, (url) => `<a href="${url}">${url}</a>`);

/** The whole email: the words, then the sign-off and the stop link, as text and as simple HTML. */
export function emailFor(step: Step, until: string, stop: string): { subject: string; text: string; html: string } {
  const { subject, text } = emailText(step, until);
  const foot = `Proairetos\nStop these emails: ${stop}`;
  const paragraphs = text.split('\n\n').map((part) => `<p>${linked(part)}</p>`).join('');
  return {
    subject,
    text: `${text}\n\n—\n${foot}`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#2b251f;max-width:34rem">${paragraphs}<p style="color:#6b6157;font-size:14px;border-top:1px solid #e6dfd4;padding-top:12px">Proairetos<br><a href="${stop}" style="color:#6b6157">Stop these emails</a></p></div>`,
  };
}

const base = (env: FirstWeekEnv) => env.SUPABASE_URL!.trim().replace(/(\/rest\/v1)?\/*$/, '');
const service = (env: FirstWeekEnv) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'content-type': 'application/json',
});

/** Accounts made in the last week (the trial's length), from Supabase's own user list. */
async function newAccounts(env: FirstWeekEnv, fetcher: Fetcher, now: number): Promise<Account[]> {
  const found: Account[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetcher(`${base(env)}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: service(env) });
    if (!response.ok) break;
    const users = ((await response.json()) as { users?: Array<{ id?: string; email?: string; created_at?: string }> }).users ?? [];
    for (const user of users) {
      if (!user.id || !user.email || !user.created_at) continue;
      if (now - Date.parse(user.created_at) < TRIAL_DAYS * DAY) found.push({ id: user.id, email: user.email, createdAt: user.created_at });
    }
    if (users.length < 200) break;
  }
  return found;
}

async function idsIn(env: FirstWeekEnv, fetcher: Fetcher, table: string, ids: string[], extra = ''): Promise<Array<Record<string, string>>> {
  if (ids.length === 0) return [];
  const response = await fetcher(`${base(env)}/rest/v1/${table}?user_id=in.(${ids.map(encodeURIComponent).join(',')})${extra}`, { headers: service(env) });
  return response.ok ? ((await response.json()) as Array<Record<string, string>>) : [];
}

/** The day's run: each account due an email it has not had, not stopped, gets it once. Returns how many went out. */
export async function sendFirstWeek(env: FirstWeekEnv, fetcher: Fetcher = fetch, now = Date.now()): Promise<number> {
  if (!firstWeekReady(env)) return 0;
  const due = (await newAccounts(env, fetcher, now))
    .map((account) => ({ ...account, step: stepFor(account.createdAt, now) }))
    .filter((account): account is Account & { step: Step } => Boolean(account.step))
    .filter((account) => account.email.toLowerCase() !== (env.OWNER_EMAIL ?? '').toLowerCase());
  const ids = due.map((account) => account.id);
  const stopped = new Set((await idsIn(env, fetcher, 'email_stops', ids, '&select=user_id')).map((row) => row.user_id));
  const sent = new Set((await idsIn(env, fetcher, 'first_week_emails', ids, '&select=user_id,step')).map((row) => `${row.user_id}:${row.step}`));
  const buyers = new Set((await idsIn(env, fetcher, 'purchases', ids, '&active=eq.true&select=user_id')).map((row) => row.user_id));
  let count = 0;
  for (const account of due) {
    if (stopped.has(account.id) || sent.has(`${account.id}:${account.step}`)) continue;
    if (account.step === 'ending' && buyers.has(account.id)) continue;
    const until = trialUntil(account.createdAt, now);
    if (!until) continue;
    const stop = await stopLink(account.id, env.EMAIL_SIGNING_SECRET!);
    const mail = emailFor(account.step, until, stop);
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'Proairetos <hello@proairetos.com>',
        to: [account.email],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        headers: { 'List-Unsubscribe': `<${stop}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }),
    }).catch(() => null);
    if (!response?.ok) continue;
    await fetcher(`${base(env)}/rest/v1/first_week_emails`, {
      method: 'POST',
      headers: { ...service(env), prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ user_id: account.id, step: account.step }),
    }).catch(() => null);
    count += 1;
  }
  return count;
}

const page = (words: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Proairetos</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 16px;line-height:1.5"><p>${words}</p><p><a href="/">Open Proairetos</a></p></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } },
  );

/** The stop link: a visit (GET) or a mail app's one-click unsubscribe (POST) stops the emails for that account. */
export async function handleEmailStop(request: Request, env: FirstWeekEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') return page('Not found.', 404);
  const url = new URL(request.url);
  const user = url.searchParams.get('u') ?? '';
  const signature = url.searchParams.get('t') ?? '';
  if (!env.EMAIL_SIGNING_SECRET || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return page('This link isn’t working right now. Reply to the email instead.', 503);
  if (!user || signature !== (await stopSignature(user, env.EMAIL_SIGNING_SECRET))) return page('This link isn’t complete. Reply to the email instead.', 400);
  const response = await fetcher(`${base(env)}/rest/v1/email_stops`, {
    method: 'POST',
    headers: { ...service(env), prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({ user_id: user }),
  }).catch(() => null);
  if (!response?.ok) return page('Couldn’t stop them. Try the link again, or reply to the email.', 502);
  return page('Emails stopped. You won’t get these emails again.');
}
