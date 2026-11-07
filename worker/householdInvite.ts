import { tooOften } from './safeFetch';

/**
 * Sends a household invitation after the browser has sealed the household reference for the recipient.
 * The service role is used only here, in the Worker; it never reaches the browser. The sealed value remains
 * end-to-end encrypted, while Resend delivers a short message that points the recipient back to Proairetos.
 */
export type HouseholdInviteEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

type Fetcher = typeof fetch;
type Person = { id: string; email?: string };
type InviteBody = {
  householdId?: string;
  toUser?: string;
  toEmail?: string;
  sealed?: string;
  link?: string;
  senderName?: string;
  householdName?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

const base = (env: HouseholdInviteEnv) => env.SUPABASE_URL!.trim().replace(/(\/rest\/v1)?\/*$/, '');
const serviceHeaders = (env: HouseholdInviteEnv) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'content-type': 'application/json',
});

async function personFrom(request: Request, env: HouseholdInviteEnv, fetcher: Fetcher): Promise<Person | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const response = await fetcher(`${base(env)}/auth/v1/user`, { headers: { authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY } });
  if (!response.ok) return null;
  const user = (await response.json().catch(() => ({}))) as { id?: string; email?: string };
  return user.id ? { id: user.id, email: user.email } : null;
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inviteMail(body: Required<Pick<InviteBody, 'senderName' | 'householdName'>> & { link?: string }, origin: string): { subject: string; text: string; html: string } {
  const sender = body.senderName || 'Someone in your family';
  const household = body.householdName || 'your household';
  const open = body.link || `${origin}/?open=settings:household`;
  const text = `${sender} invited you to join ${household} in Proairetos.\n\nOpen Proairetos to accept the invitation:\n${open}\n\nIf you did not expect this invitation, you can ignore this email.`;
  return {
    subject: `${sender} invited you to ${household} on Proairetos`,
    text,
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#2b251f;max-width:34rem"><p>${escape(sender)} invited you to join <strong>${escape(household)}</strong> in Proairetos.</p><p><a href="${escape(open)}" style="color:#496b57">Open Proairetos to accept the invitation</a></p><p style="color:#6b6157;font-size:14px;border-top:1px solid #e6dfd4;padding-top:12px">If you did not expect this invitation, you can ignore this email.</p></div>`,
  };
}

/** Sends one household email invitation and keeps the encrypted row for the recipient's in-app notification. */
export async function handleHouseholdInviteRequest(request: Request, env: HouseholdInviteEnv, fetcher: Fetcher = fetch): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return reply(403, { error: 'Not allowed.' });
  if (request.method !== 'POST') return reply(405, { error: 'Not allowed.' });
  if (tooOften(request)) return reply(429, { error: 'Too many invitations. Try again in a minute.' });
  if (!env.RESEND_API_KEY || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return reply(503, { error: 'Email invitations are not set up yet. Add the Resend and Supabase Worker secrets, then redeploy.' });
  }

  const person = await personFrom(request, env, fetcher);
  if (!person) return reply(401, { error: 'Sign in first.' });
  const body = (await request.json().catch(() => ({}))) as InviteBody;
  const householdId = clean(body.householdId, 64);
  const toUser = clean(body.toUser, 64);
  const toEmail = clean(body.toEmail, 254).toLowerCase();
  const sealed = clean(body.sealed, 6000);
  const link = clean(body.link, 2400);
  const senderName = clean(body.senderName, 120) || person.email || 'Someone in your family';
  const householdName = clean(body.householdName, 120) || 'your household';
  if (!UUID.test(householdId) || !EMAIL.test(toEmail) || (toUser ? !UUID.test(toUser) || !sealed : !link)) return reply(400, { error: 'That invitation is incomplete. Try again.' });
  if (toUser === person.id || toEmail === person.email?.trim().toLowerCase()) return reply(400, { error: 'That’s your own email.' });
  if (!toUser) {
    try {
      const invite = new URL(link);
      const open = new URLSearchParams(invite.search).get('open') ?? '';
      const key = new URLSearchParams(invite.hash.replace(/^#/, '')).get('k') ?? '';
      if (invite.origin !== url.origin || invite.pathname !== '/' || !open.startsWith(`household:${householdId}`) || key.length < 40) return reply(400, { error: 'That invitation link is not valid.' });
    } catch {
      return reply(400, { error: 'That invitation link is not valid.' });
    }
  }

  const service = serviceHeaders(env);
  const householdResponse = await fetcher(`${base(env)}/rest/v1/shared_lists?id=eq.${encodeURIComponent(householdId)}&select=id,created_by`, { headers: service });
  if (!householdResponse.ok) return reply(502, { error: 'The household could not be checked. Try again.' });
  const householdRows = (await householdResponse.json().catch(() => [])) as Array<{ id?: string; created_by?: string }>;
  const householdRow = householdRows[0];
  if (!householdRow) return reply(404, { error: 'That household no longer exists.' });
  let canManage = householdRow.created_by === person.id;
  if (!canManage) {
    const roleResponse = await fetcher(`${base(env)}/rest/v1/household_member_roles?household_id=eq.${encodeURIComponent(householdId)}&user_id=eq.${encodeURIComponent(person.id)}&role=eq.admin&select=user_id`, { headers: service });
    if (!roleResponse.ok) return reply(502, { error: 'The household could not be checked. Try again.' });
    canManage = ((await roleResponse.json().catch(() => [])) as unknown[]).length > 0;
  }
  if (!canManage) return reply(403, { error: 'Only a household owner or administrator can invite people.' });

  let inviteId: string | undefined;
  let created = false;
  if (toUser) {
    // The browser got this key from the authenticated invitee_key function. Confirm that the account still owns it
    // and that the email has not changed before accepting any sealed data.
    const accountResponse = await fetcher(`${base(env)}/rest/v1/account_keys?user_id=eq.${encodeURIComponent(toUser)}&select=user_id`, { headers: service });
    if (!accountResponse.ok || ((await accountResponse.json().catch(() => [])) as unknown[]).length === 0) return reply(409, { error: 'That account is not ready to receive family invitations yet.' });
    const accountUserResponse = await fetcher(`${base(env)}/auth/v1/admin/users/${encodeURIComponent(toUser)}`, { headers: service });
    if (!accountUserResponse.ok) return reply(409, { error: 'That Proairetos account could not be found.' });
    const accountUser = (await accountUserResponse.json().catch(() => ({}))) as { email?: string };
    if (accountUser.email?.trim().toLowerCase() !== toEmail) return reply(400, { error: 'The invitation email no longer matches that account.' });

    const existingResponse = await fetcher(`${base(env)}/rest/v1/household_invites?household_id=eq.${encodeURIComponent(householdId)}&to_user=eq.${encodeURIComponent(toUser)}&select=id&limit=1`, { headers: service });
    if (!existingResponse.ok) return reply(502, { error: 'The invitation could not be checked. Try again.' });
    const existing = ((await existingResponse.json().catch(() => [])) as Array<{ id?: string }>)[0];
    inviteId = existing?.id;
    if (inviteId) {
      const update = await fetcher(`${base(env)}/rest/v1/household_invites?id=eq.${encodeURIComponent(inviteId)}`, {
        method: 'PATCH', headers: { ...service, prefer: 'return=minimal' }, body: JSON.stringify({ to_email: toEmail, from_user: person.id, sealed, created_at: new Date().toISOString() }),
      });
      if (!update.ok) return reply(502, { error: 'The invitation could not be updated. Try again.' });
    } else {
      const inserted = await fetcher(`${base(env)}/rest/v1/household_invites`, {
        method: 'POST', headers: { ...service, prefer: 'return=representation' }, body: JSON.stringify({ household_id: householdId, to_user: toUser, to_email: toEmail, from_user: person.id, sealed }),
      });
      if (!inserted.ok) return reply(inserted.status === 409 ? 409 : 502, { error: inserted.status === 409 ? 'A family invitation for this person is already pending.' : 'The invitation could not be saved. Try again.' });
      const rows = (await inserted.json().catch(() => [])) as Array<{ id?: string }>;
      inviteId = rows[0]?.id;
      created = true;
    }
    if (!inviteId) return reply(502, { error: 'The invitation could not be saved. Try again.' });
  }

  const mail = inviteMail({ senderName, householdName, link }, url.origin);
  const sent = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM || 'Proairetos <hello@proairetos.com>', to: [toEmail], subject: mail.subject, text: mail.text, html: mail.html }),
  }).catch(() => null);
  if (!sent?.ok) {
    if (created && inviteId) await fetcher(`${base(env)}/rest/v1/household_invites?id=eq.${encodeURIComponent(inviteId)}`, { method: 'DELETE', headers: service }).catch(() => undefined);
    return reply(502, { error: 'The invitation email could not be sent. Try again.' });
  }
  return reply(200, { ok: true, notified: Boolean(toUser), link: !toUser });
}

