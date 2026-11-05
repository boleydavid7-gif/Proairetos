import { describe, expect, it } from 'vitest';
import { handleWebhook, myReferral, PLAN_PRICES, startCheckout, type StoreEnv } from '../../../worker/store';
import { readReferral, referralCode, REFERRAL_COUPON } from '../../../worker/referrals';

const env: StoreEnv = {
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  REFERRAL_SECRET: 'share-secret',
};

const SHARER = '3f2b8d1e-1c4a-4b7e-9d52-0a6f7c9e1b11';
const NEWCOMER = '9a7c5e20-6b3d-4f18-8c04-52d1e7b3a622';
const people: Record<string, { id: string; email: string }> = { sharer: { id: SHARER, email: 'sharer@example.com' }, newcomer: { id: NEWCOMER, email: 'new@example.com' } };

type Referral = { id: string; referrer_id: string; referee_id: string; applied: boolean };

/** Supabase and Stripe in memory: who is signed in, what they own, the referrals table and what was sent to Stripe. */
function world(start: { referrals?: Referral[]; sharerSubscribed?: boolean } = {}) {
  const referrals: Referral[] = [...(start.referrals ?? [])];
  const purchases = start.sharerSubscribed ? [{ user_id: SHARER, app: 'core', active: true, subscription_id: 'sub_sharer' }] : [];
  const stripe: { url: string; form: URLSearchParams }[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (url.endsWith('/auth/v1/user')) {
      const token = new Headers(init?.headers).get('authorization')?.replace('Bearer ', '') ?? '';
      return people[token] ? new Response(JSON.stringify(people[token])) : new Response('{}', { status: 401 });
    }
    if (url.startsWith('https://api.stripe.com')) {
      stripe.push({ url, form: new URLSearchParams(String(init?.body ?? '')) });
      return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/c/1' }));
    }
    const parsed = new URL(url);
    const eq = (key: string) => parsed.searchParams.get(key)?.replace('eq.', '');
    if (parsed.pathname.endsWith('/purchases')) {
      if (method === 'POST') return new Response('', { status: 201 });
      const found = purchases.filter((row) => row.user_id === eq('user_id') && row.app === eq('app') && row.active);
      return new Response(JSON.stringify(found));
    }
    if (parsed.pathname.endsWith('/referrals')) {
      if (method === 'POST') {
        const row = JSON.parse(String(init!.body)) as Omit<Referral, 'id' | 'applied'>;
        if (referrals.some((each) => each.referrer_id === row.referrer_id || each.referee_id === row.referee_id)) return new Response('{}', { status: 409 });
        referrals.push({ id: `r${referrals.length + 1}`, applied: false, ...row });
        return new Response('', { status: 201 });
      }
      if (method === 'PATCH') {
        const row = referrals.find((each) => each.id === eq('id'));
        if (row) row.applied = true;
        return new Response(null, { status: 204 });
      }
      const found = referrals.filter((row) => (eq('referrer_id') ? row.referrer_id === eq('referrer_id') : row.referee_id === eq('referee_id')));
      return new Response(JSON.stringify(found));
    }
    return new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;
  return { fetcher, referrals, stripe };
}

const checkout = (body: unknown, token: string) => new Request('https://proairetos.com/api/store/checkout', { method: 'POST', body: JSON.stringify(body), headers: { authorization: `Bearer ${token}` } });
const sessionOf = (stripe: { url: string; form: URLSearchParams }[]) => stripe.find((call) => call.url.endsWith('/checkout/sessions'))!.form;

async function signed(payload: string, time: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_test'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${time}.${payload}`));
  return `t=${time},v1=${[...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
async function paid(fetcher: typeof fetch, user: string, metadata: Record<string, string> = {}, app = 'core') {
  const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: `cs_${user}`, subscription: `sub_${user}`, payment_status: 'paid', amount_total: 1299, currency: 'usd', metadata: { app, apps: 'core', user, ...metadata } } } });
  return handleWebhook(new Request('https://proairetos.com/api/store/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': await signed(payload, Math.floor(Date.now() / 1000)) } }), env, fetcher);
}

describe('the share code', () => {
  it('names the sharer, and an altered or invented code names no one', async () => {
    const code = await referralCode(env, SHARER);
    expect(await readReferral(env, code)).toBe(SHARER);
    expect(await readReferral(env, `${code}x`)).toBeUndefined();
    expect(await readReferral(env, `${code.split('.')[0]}.AAAAAAAAAAAA`)).toBeUndefined();
    expect(await readReferral({ ...env, REFERRAL_SECRET: 'other' }, code)).toBeUndefined();
    expect(await readReferral(env, 'nonsense')).toBeUndefined();
    expect(await readReferral({}, code)).toBeUndefined();
  });
});

describe('yearly Core', () => {
  it('is its own price, billed every year, and a monthly owner already has it', async () => {
    expect(PLAN_PRICES.coreyear).toBe(14999);
    const { fetcher, stripe } = world();
    await startCheckout(checkout({ app: 'coreyear' }, 'newcomer'), env, fetcher);
    const form = sessionOf(stripe);
    expect(form.get('line_items[0][price_data][unit_amount]')).toBe('14999');
    expect(form.get('line_items[0][price_data][recurring][interval]')).toBe('year');
    expect(form.get('metadata[apps]')).toBe('core');
    expect(form.get('success_url')).toBe('https://proairetos.com/?open=settings:store#bought=core');
  });
});

describe('sharing earns the sharer 20% for six months, once', () => {
  it('marks a checkout that came through a good code, and ignores a bad, own or repeated one', async () => {
    const code = await referralCode(env, SHARER);
    const good = world();
    await startCheckout(checkout({ app: 'core', ref: code }, 'newcomer'), env, good.fetcher);
    expect(sessionOf(good.stripe).get('metadata[referrer]')).toBe(SHARER);
    expect(sessionOf(good.stripe).get('discounts[0][coupon]')).toBeNull();

    const forged = world();
    await startCheckout(checkout({ app: 'core', ref: `${code}x` }, 'newcomer'), env, forged.fetcher);
    expect(sessionOf(forged.stripe).get('metadata[referrer]')).toBeNull();

    const own = world();
    await startCheckout(checkout({ app: 'coreyear', ref: code }, 'sharer'), env, own.fetcher);
    expect(sessionOf(own.stripe).get('metadata[referrer]')).toBeNull();

    const used = world({ referrals: [{ id: 'r0', referrer_id: SHARER, referee_id: 'someone-else', applied: true }] });
    await startCheckout(checkout({ app: 'core', ref: code }, 'newcomer'), env, used.fetcher);
    expect(sessionOf(used.stripe).get('metadata[referrer]')).toBeNull();

    const cloud = world();
    await startCheckout(checkout({ app: 'cloud', ref: code }, 'newcomer'), env, cloud.fetcher);
    expect(sessionOf(cloud.stripe).get('metadata[referrer]')).toBeNull();
  });

  it('puts the discount on the sharer’s plan when the newcomer pays and the sharer is subscribed', async () => {
    const { fetcher, referrals, stripe } = world({ sharerSubscribed: true });
    expect((await paid(fetcher, NEWCOMER, { referrer: SHARER })).status).toBe(200);
    expect(referrals).toMatchObject([{ id: 'r1', referrer_id: SHARER, referee_id: NEWCOMER, applied: true }]);
    expect(stripe.map((call) => call.url)).toEqual(['https://api.stripe.com/v1/coupons', 'https://api.stripe.com/v1/subscriptions/sub_sharer']);
    expect(stripe[0].form.get('percent_off')).toBe('20');
    expect(stripe[0].form.get('duration_in_months')).toBe('6');
    expect(stripe[1].form.get('discounts[0][coupon]')).toBe(REFERRAL_COUPON);
  });

  it('keeps the credit for a sharer who has not subscribed, and takes it off their first payment', async () => {
    const { fetcher, referrals, stripe } = world();
    await paid(fetcher, NEWCOMER, { referrer: SHARER });
    expect(referrals[0].applied).toBe(false);
    expect(stripe).toHaveLength(0);
    await startCheckout(checkout({ app: 'coreyear' }, 'sharer'), env, fetcher);
    const form = sessionOf(stripe);
    expect(form.get('discounts[0][coupon]')).toBe(REFERRAL_COUPON);
    expect(form.get('metadata[credit]')).toBe('r1');
    await paid(fetcher, SHARER, { credit: 'r1' }, 'coreyear');
    expect(referrals[0].applied).toBe(true);
  });

  it('gives one discount per sharer: a second newcomer changes nothing', async () => {
    const { fetcher, referrals } = world({ sharerSubscribed: true });
    await paid(fetcher, NEWCOMER, { referrer: SHARER });
    await paid(fetcher, 'a-third-person', { referrer: SHARER });
    expect(referrals).toHaveLength(1);
  });

  it('shows the share link and the state of the credit, and settles a waiting credit once subscribed', async () => {
    const asked = (token: string, fetcher: typeof fetch) => myReferral(new Request('https://proairetos.com/api/store/referral', { headers: { authorization: `Bearer ${token}` } }), env, fetcher);
    const quiet = world();
    expect(await (await asked('sharer', quiet.fetcher)).json()).toEqual({ available: true, code: await referralCode(env, SHARER), earned: false, applied: false });
    const waiting = world({ referrals: [{ id: 'r1', referrer_id: SHARER, referee_id: NEWCOMER, applied: false }], sharerSubscribed: true });
    expect(await (await asked('sharer', waiting.fetcher)).json()).toMatchObject({ earned: true, applied: true });
    expect(waiting.referrals[0].applied).toBe(true);
    expect(await (await myReferral(new Request('https://proairetos.com/api/store/referral'), { ...env, REFERRAL_SECRET: undefined }, quiet.fetcher)).json()).toEqual({ available: false });
  });
});
