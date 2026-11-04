/**
 * Sends the notification email for an already-created, encrypted household invitation.
 * The invitation payload remains end-to-end encrypted in Supabase; this email only tells
 * the recipient where to open Proairetos to accept it.
 */
export type HouseholdInviteEmailEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

type Fetcher = typeof fetch;
const SITE = 'https://proairetos.com';
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const base = (env: HouseholdInviteEmailEnv) => env.SUPABASE_URL!.trim().replace(/(\\/rest\\/v1)?\\/*$/, '');
const serviceHeaders = (env: HouseholdInviteEmailEnv) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'content-type': 'application/json',
});

/** Only the authenticated sender of this exact stored invite can request its email. */
export async function sendHouseholdInviteEmail(
  request: Request,
  env: HouseholdInviteEmailEnv,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  if (!env.RESEND_API_KEY || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(503, { error: 'Household invitation email is not configured on the server. The invitation is saved in Proairetos, but no email was sent.' });
  }

  const token = request.headers.get('authorization')?.match(/^Bearer\\s+(.+)$/i)?.[1];
  if (!token) return json(401, { error: 'Sign in again to send this invitation.' });

  const personResponse = await fetcher(`${base(env)}/auth/v1/user`, {
    headers: { authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY! },
  }).catch(() => null);
  if (!personResponse?.ok) return json(401, { error: 'Your sign-in expired. Sign in again and retry the invitation.' });
  const person = await personResponse.json() as { id?: string; email?: string };
  if (!person.id) return json(401, { error: 'Could not verify your signed-in account.' });

  const body = await request.json().catch(() => ({})) as { inviteId?: string };
  const inviteId = String(body.inviteId ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) return json(400, { error: 'The invitation reference is invalid.' });

  const query = new URLSearchParams({
    id: `eq.${inviteId}`,
    from_user: `eq.${person.id}`,
    select: 'id,to_email,household_id',
    limit: '1',
  });
  const inviteResponse = await fetcher(`${base(env)}/rest/v1/household_invites?${query}`, {
    headers: serviceHeaders(env),
  }).catch(() => null);
  if (!inviteResponse?.ok) return json(502, { error: 'Could not verify the saved household invitation.' });
  const rows = await inviteResponse.json() as Array<{ id: string; to_email: string; household_id: string | null }>;
  const invite = rows[0];
  if (!invite || !invite.household_id) return json(404, { error: 'The invitation was not found or is no longer active.' });

  const recipient = invite.to_email.trim().toLowerCase();
  if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(recipient)) return json(400, { error: 'The invitation does not contain a valid recipient email.' });

  const subject = `${person.email || 'Someone'} invited you to a Proairetos household`;
  const link = `${SITE}/?open=settings:household`;
  const text = [
    `${person.email || 'Someone'} invited you to join their household on Proairetos.`,
    '',
    'Open Proairetos and sign in with this email address to see and accept the invitation in Settings → Household.',
    '',
    `Open Proairetos: ${link}`,
    '',
    'The invitation itself is encrypted and is only visible to the invited account.',
    '',
    'If you were not expecting this invitation, you can ignore this email.',
  ].join('\\n');
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.55;color:#28251f;max-width:36rem"><p><strong>${escapeHtml(person.email || 'Someone')}</strong> invited you to join their household on Proairetos.</p><p>Open Proairetos and sign in with this email address to see and accept the invitation in <strong>Settings → Household</strong>.</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#176b70;color:#fff;text-decoration:none;border-radius:8px">Open Proairetos</a></p><p style="font-size:13px;color:#706a62">The invitation itself is encrypted and is only visible to the invited account. If you were not expecting this invitation, you can ignore this email.</p></div>`;
  const sent = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
      'Idempotency-Key': `household-invite-${invite.id}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'Proairetos <hello@proairetos.com>',
      to: [recipient],
      subject,
      text,
      html,
    }),
  }).catch(() => null);
  if (!sent?.ok) {
    const detail = sent ? await sent.text().catch(() => '') : '';
    return json(502, { error: detail ? `The invitation was saved, but the email provider could not send it: ${detail.slice(0, 240)}` : 'The invitation was saved, but the email provider could not send it. Check the Worker email configuration.' });
  }
  return json(200, { sent: true, to: recipient });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
