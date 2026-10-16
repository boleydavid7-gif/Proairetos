import { describe, expect, it } from 'vitest';
import { handleStoreRequest, handleWebhook, isTester, mine, startCheckout, stripeSigned, type StoreEnv } from '../../../worker/store';

const env: StoreEnv = {
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
};

type Call = { url: string; init?: RequestInit };

/** A stand-in for Supabase and Stripe: the person, what they own, and the checkout page. */
function fake(options: { email?: string; owned?: boolean; insert?: number } = {}) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/v1/user')) {
      const token = new Headers(init?.headers).get('authorization');
      return token === 'Bearer good' ? new Response(JSON.stringify({ id: 'user-1', email: options.email ?? 'reader@example.com' })) : new Response('{}', { status: 401 });
    }
    if (url.includes('/rest/v1/purchases?user_id')) return new Response(JSON.stringify(options.owned ? [{ app: 'soma' }] : []));
    if (url.includes('/rest/v1/purchases?on_conflict')) return new Response('', { status: options.insert ?? 201 });
    if (url === 'https://api.stripe.com/v1/checkout/sessions') return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/c/1' }));
    return new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

const checkout = (body: unknown, token = 'good') =>
  new Request('https://proairetos.com/api/store/checkout', { method: 'POST', body: JSON.stringify(body), headers: { authorization: `Bearer ${token}` } });

async function signedBody(payload: string, secret: string, time: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${time}.${payload}`));
  return `t=${time},v1=${[...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

describe('the Store on the Worker', () => {
  it('stays free until every secret is set', async () => {
    const free = await handleStoreRequest(new Request('https://proairetos.com/api/store'), {});
    expect(await free.json()).toEqual({ paid: false, price: 499, currency: 'usd' });
    const paid = await handleStoreRequest(new Request('https://proairetos.com/api/store'), env);
    expect(((await paid.json()) as { paid: boolean }).paid).toBe(true);
    expect((await startCheckout(checkout({ app: 'soma' }), {}, fake().fetcher)).status).toBe(503);
  });

  it('opens Stripe checkout at $4.99 for a signed-in person, and says when an app is already theirs', async () => {
    const { fetcher, calls } = fake();
    const response = await startCheckout(checkout({ app: 'soma' }), env, fetcher);
    expect(await response.json()).toEqual({ url: 'https://checkout.stripe.com/c/1' });
    const form = new URLSearchParams(String(calls.at(-1)!.init!.body));
    expect(form.get('mode')).toBe('payment');
    expect(form.get('line_items[0][price_data][unit_amount]')).toBe('499');
    expect(form.get('metadata[app]')).toBe('soma');
    expect(form.get('metadata[user]')).toBe('user-1');
    expect(form.get('success_url')).toBe('https://proairetos.com/?open=settings:store#bought=soma');
    expect(await (await startCheckout(checkout({ app: 'soma' }), env, fake({ owned: true }).fetcher)).json()).toEqual({ owned: true });
  });

  it('turns away unknown apps and people not signed in', async () => {
    expect((await startCheckout(checkout({ app: 'proairetos' }), env, fake().fetcher)).status).toBe(400);
    expect((await startCheckout(checkout({ app: 'soma' }, 'bad'), env, fake().fetcher)).status).toBe(401);
  });

  it('gives beta testers every app without paying, by email from the owner list', async () => {
    const withTesters = { ...env, STORE_TESTERS: 'Friend@Example.com, other@example.com' };
    expect(isTester(withTesters, 'friend@example.com')).toBe(true);
    expect(isTester(withTesters, 'stranger@example.com')).toBe(false);
    expect(isTester(env, 'friend@example.com')).toBe(false);
    const { fetcher, calls } = fake({ email: 'friend@example.com' });
    expect(await (await startCheckout(checkout({ app: 'ergon' }), withTesters, fetcher)).json()).toEqual({ owned: true });
    expect(calls.some((call) => call.url.includes('stripe.com'))).toBe(false);
    const ask = (token: string) => new Request('https://proairetos.com/api/store/mine', { headers: { authorization: `Bearer ${token}` } });
    expect(await (await mine(ask('good'), withTesters, fetcher)).json()).toEqual({ tester: true });
    expect(await (await mine(ask('good'), withTesters, fake().fetcher)).json()).toEqual({ tester: false });
    expect((await mine(ask('bad'), withTesters, fetcher)).status).toBe(401);
  });

  it('checks the Stripe signature and its time', async () => {
    const now = Date.parse('2026-10-16T12:00:00Z');
    const time = now / 1000;
    const header = await signedBody('{"a":1}', 'whsec_test', time);
    expect(await stripeSigned('{"a":1}', header, 'whsec_test', now)).toBe(true);
    expect(await stripeSigned('{"a":2}', header, 'whsec_test', now)).toBe(false);
    expect(await stripeSigned('{"a":1}', header, 'other', now)).toBe(false);
    expect(await stripeSigned('{"a":1}', header, 'whsec_test', now + 10 * 60_000)).toBe(false);
    expect(await stripeSigned('{"a":1}', null, 'whsec_test', now)).toBe(false);
  });

  it('records a paid checkout once, and leaves unpaid ones alone', async () => {
    const event = (type: string, status = 'paid') =>
      JSON.stringify({ type, data: { object: { id: 'cs_1', payment_status: status, amount_total: 499, currency: 'usd', metadata: { app: 'soma', user: 'user-1' } } } });
    const post = async (payload: string) =>
      new Request('https://proairetos.com/api/store/webhook', {
        method: 'POST',
        body: payload,
        headers: { 'stripe-signature': await signedBody(payload, 'whsec_test', Math.floor(Date.now() / 1000)) },
      });
    const paid = fake();
    expect((await handleWebhook(await post(event('checkout.session.completed')), env, paid.fetcher)).status).toBe(200);
    const insert = paid.calls.find((call) => call.url.includes('on_conflict'))!;
    expect(JSON.parse(String(insert.init!.body))).toEqual({ user_id: 'user-1', app: 'soma', session_id: 'cs_1', amount: 499, currency: 'usd' });
    expect(new Headers(insert.init!.headers).get('prefer')).toContain('ignore-duplicates');

    const unpaid = fake();
    await handleWebhook(await post(event('checkout.session.completed', 'unpaid')), env, unpaid.fetcher);
    expect(unpaid.calls).toHaveLength(0);
    expect((await handleWebhook(await post(event('checkout.session.completed')), env, fake({ insert: 500 }).fetcher)).status).toBe(500);
    const forged = new Request('https://proairetos.com/api/store/webhook', { method: 'POST', body: event('checkout.session.completed'), headers: { 'stripe-signature': 't=1,v1=00' } });
    expect((await handleWebhook(forged, env, fake().fetcher)).status).toBe(400);
  });
});
