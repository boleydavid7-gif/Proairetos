import { beforeEach, describe, expect, it } from 'vitest';
import { handleHouseholdInviteRequest, type HouseholdInviteEnv } from '../../../worker/householdInvite';
import { resetRateLimit } from '../../../worker/safeFetch';

const env: HouseholdInviteEnv = {
  RESEND_API_KEY: 're_test',
  EMAIL_FROM: 'Proairetos <hello@example.com>',
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
};

const householdId = '11111111-1111-4111-8111-111111111111';
const targetId = '22222222-2222-4222-8222-222222222222';

function request(body: unknown, token = 'good') {
  return new Request('https://proairetos.com/api/household/invite', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('household email invitations', () => {
  beforeEach(() => resetRateLimit());

  it('stores the sealed invite, sends the email, and keeps the recipient address private from the browser', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'owner', email: 'owner@example.com' });
      if (url.includes('/rest/v1/shared_lists?')) return Response.json([{ id: householdId, created_by: 'owner' }]);
      if (url.includes('/rest/v1/account_keys?')) return Response.json([{ user_id: targetId }]);
      if (url.endsWith(`/auth/v1/admin/users/${targetId}`)) return Response.json({ id: targetId, email: 'friend@example.com' });
      if (url.includes('/rest/v1/household_invites?') && url.includes('select=id')) return Response.json([]);
      if (url.endsWith('/rest/v1/household_invites')) return Response.json([{ id: 'invite-1' }], { status: 201 });
      if (url === 'https://api.resend.com/emails') return Response.json({ id: 'email-1' });
      return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;

    const response = await handleHouseholdInviteRequest(request({ householdId, toUser: targetId, toEmail: 'friend@example.com', sealed: 'sealed-value', senderName: 'David', householdName: 'Home' }), env, fetcher);
    expect(await response.json()).toEqual({ ok: true, notified: true, link: false });

    const insert = calls.find((call) => call.url.endsWith('/rest/v1/household_invites'));
    expect(JSON.parse(String(insert?.init?.body))).toMatchObject({ household_id: householdId, to_user: targetId, to_email: 'friend@example.com', sealed: 'sealed-value' });
    const mail = calls.find((call) => call.url === 'https://api.resend.com/emails');
    expect(JSON.parse(String(mail?.init?.body))).toMatchObject({ to: ['friend@example.com'], from: 'Proairetos <hello@example.com>' });
    expect(JSON.parse(String(mail?.init?.body)).text).toContain('Open Proairetos to accept the invitation');
  });

  it('does not create a database invite when email delivery fails', async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'owner', email: 'owner@example.com' });
      if (url.includes('/rest/v1/shared_lists?')) return Response.json([{ id: householdId, created_by: 'owner' }]);
      if (url.includes('/rest/v1/account_keys?')) return Response.json([{ user_id: targetId }]);
      if (url.endsWith(`/auth/v1/admin/users/${targetId}`)) return Response.json({ email: 'friend@example.com' });
      if (url.includes('/rest/v1/household_invites?') && url.includes('select=id')) return Response.json([]);
      if (url.endsWith('/rest/v1/household_invites')) return Response.json([{ id: 'invite-1' }], { status: 201 });
      if (url === 'https://api.resend.com/emails') return new Response('{}', { status: 500 });
      if (url.includes('/rest/v1/household_invites?id=eq.')) return new Response('', { status: 204 });
      return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;

    const response = await handleHouseholdInviteRequest(request({ householdId, toUser: targetId, toEmail: 'friend@example.com', sealed: 'sealed-value' }), env, fetcher);
    expect(response.status).toBe(502);
    expect(calls.some((url) => url.includes('/rest/v1/household_invites?id=eq.invite-1'))).toBe(true);
  });

  it('emails a secure join link when the recipient does not have a ready account key', async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'owner', email: 'owner@example.com' });
      if (url.includes('/rest/v1/shared_lists?')) return Response.json([{ id: householdId, created_by: 'owner' }]);
      if (url === 'https://api.resend.com/emails') return Response.json({ id: 'email-1' });
      return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;
    const link = `https://proairetos.com/?open=household:${householdId}#k=${'a'.repeat(44)}&n=Home`;
    const response = await handleHouseholdInviteRequest(request({ householdId, toEmail: 'new@example.com', link, senderName: 'David', householdName: 'Home' }), env, fetcher);
    expect(await response.json()).toEqual({ ok: true, notified: false, link: true });
    expect(calls.some((url) => url.includes('/rest/v1/household_invites'))).toBe(false);
  });

  it('reports the missing Worker mail setup instead of claiming success', async () => {
    const response = await handleHouseholdInviteRequest(request({ householdId, toUser: targetId, toEmail: 'friend@example.com', sealed: 'sealed-value' }), { ...env, RESEND_API_KEY: undefined });
    expect(response.status).toBe(503);
  });
});

