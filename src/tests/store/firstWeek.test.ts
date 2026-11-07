import { describe, expect, it } from 'vitest';
import { emailFor, handleEmailStop, sendFirstWeek, stepFor, stopLink, stopSignature, type FirstWeekEnv } from '../../../worker/firstWeek';
import { containsJudgmentLanguage } from '../../core/rules/languageRules';

const DAY = 86_400_000;
const now = Date.parse('2026-11-10T15:23:00.000Z');
const ago = (days: number, hours = 1) => new Date(now - days * DAY - hours * 3_600_000).toISOString();
const env: FirstWeekEnv = {
  RESEND_API_KEY: 're_test',
  EMAIL_SIGNING_SECRET: 'secret',
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  OWNER_EMAIL: 'owner@example.com',
};

type Call = { url: string; body?: Record<string, unknown> };
function server(rows: { users: Array<{ id: string; email: string; created_at: string }>; stops?: string[]; sent?: Array<[string, string]>; buyers?: string[] }) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined });
    if (url.includes('/auth/v1/admin/users')) return Response.json({ users: rows.users });
    if (url.includes('/rest/v1/email_stops?')) return Response.json((rows.stops ?? []).map((user_id) => ({ user_id })));
    if (url.includes('/rest/v1/first_week_emails?')) return Response.json((rows.sent ?? []).map(([user_id, step]) => ({ user_id, step })));
    if (url.includes('/rest/v1/purchases?')) return Response.json((rows.buyers ?? []).map((user_id) => ({ user_id })));
    if (url.includes('api.resend.com')) return Response.json({ id: 'email-1' });
    return new Response(null, { status: 201 });
  }) as unknown as typeof fetch;
  return { fetcher, calls, mails: () => calls.filter((call) => call.url.includes('api.resend.com')) };
}

describe('the first-week emails', () => {
  it('sends day one, day three and the trial’s end, each on two days in case a run is missed', () => {
    expect(stepFor(ago(0), now)).toBe('start');
    expect(stepFor(ago(1), now)).toBe('start');
    expect(stepFor(ago(2), now)).toBe('week');
    expect(stepFor(ago(3), now)).toBe('week');
    expect(stepFor(ago(4), now)).toBeUndefined();
    expect(stepFor(ago(5), now)).toBe('ending');
    expect(stepFor(ago(6), now)).toBe('ending');
    expect(stepFor(ago(7), now)).toBeUndefined();
  });

  it('says plain things, names the trial’s end day and always carries the stop link', () => {
    const until = '2026-11-12T10:00:00.000Z';
    for (const step of ['start', 'week', 'ending'] as const) {
      const mail = emailFor(step, until, 'https://proairetos.com/api/emails/stop?u=a&t=b');
      expect(mail.text).toContain('Stop these emails: https://proairetos.com/api/emails/stop?u=a&t=b');
      expect(mail.html).toContain('Stop these emails');
      expect(containsJudgmentLanguage(`${mail.subject} ${mail.text}`)).toBe(false);
    }
    expect(emailFor('ending', until, 'x').subject).toBe('Your free trial ends Thursday');
    expect(emailFor('start', until, 'x').text).toContain('Thursday, November 12');
  });

  it('sends each email once, not after a stop, not the trial’s end to someone who bought, never to the owner', async () => {
    const { fetcher, mails, calls } = server({
      users: [
        { id: 'new', email: 'new@example.com', created_at: ago(0) },
        { id: 'week', email: 'week@example.com', created_at: ago(2) },
        { id: 'had', email: 'had@example.com', created_at: ago(2) },
        { id: 'stop', email: 'stop@example.com', created_at: ago(0) },
        { id: 'paid', email: 'paid@example.com', created_at: ago(5) },
        { id: 'trial', email: 'trial@example.com', created_at: ago(5) },
        { id: 'old', email: 'old@example.com', created_at: ago(30) },
        { id: 'me', email: 'owner@example.com', created_at: ago(0) },
      ],
      stops: ['stop'],
      sent: [['had', 'week']],
      buyers: ['paid'],
    });
    expect(await sendFirstWeek(env, fetcher, now)).toBe(3);
    const to = mails().map((call) => (call.body!.to as string[])[0]);
    expect(to).toEqual(['new@example.com', 'week@example.com', 'trial@example.com']);
    const first = mails()[0].body!;
    expect((first.headers as Record<string, string>)['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(calls.filter((call) => call.url.endsWith('/rest/v1/first_week_emails')).map((call) => call.body)).toEqual([
      { user_id: 'new', step: 'start' },
      { user_id: 'week', step: 'week' },
      { user_id: 'trial', step: 'ending' },
    ]);
  });

  it('does nothing until Resend and the signing secret are set', async () => {
    const { fetcher, calls } = server({ users: [{ id: 'new', email: 'new@example.com', created_at: ago(0) }] });
    expect(await sendFirstWeek({ ...env, RESEND_API_KEY: undefined }, fetcher, now)).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('stops the emails only from a link signed for that account', async () => {
    const link = await stopLink('user-1', 'secret');
    const { fetcher, calls } = server({ users: [] });
    const good = await handleEmailStop(new Request(link, { method: 'POST' }), env, fetcher);
    expect(good.status).toBe(200);
    expect(calls.at(-1)?.body).toEqual({ user_id: 'user-1' });
    const forged = `https://proairetos.com/api/emails/stop?u=user-2&t=${await stopSignature('user-1', 'secret')}`;
    expect((await handleEmailStop(new Request(forged), env, fetcher)).status).toBe(400);
  });
});
