/*
 * The Store's payments: Proairetos is free, while the family and its services are monthly Stripe subscriptions.
 *
 *   GET  /api/store            whether paying is set up, and the plan prices
 *   POST /api/store/checkout   { app } with the person's sign-in → a Stripe Checkout address
 *   POST /api/store/webhook    Stripe tells us a payment went through; the purchase is recorded
 *
 * Secrets (wrangler secret put …): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY. Variables:
 * SUPABASE_URL, SUPABASE_ANON_KEY (already set for Capture from anywhere). Until all are present checkout stays closed; apps open only to the owner, beta testers and purchases.
 * The owner can also grant seven-day access from Settings; those rows live in `beta_access`.
 *
 *   GET  /api/store/mine       with the person's sign-in → { tester } (whether this account is on that list)
 */

import { applyCredit, creditOf, ensureCoupon, keepReferral, markApplied, readReferral, REFERRAL_COUPON, referralCode, referralsOn, usable, type ReferralEnv } from './referrals';

export type StoreEnv = ReferralEnv & {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** Primary account allowed to manage store access. */
  OWNER_EMAIL?: string;
  /** Additional permanent owner accounts, comma-separated. */
  OWNER_EMAILS?: string;
};

export const PLAN_PRICES = { core: 999, coreyear: 10789, cloud: 299 } as const;
export const PRICE_CENTS = PLAN_PRICES.core;
export const CURRENCY = 'usd';

export const STORE_PLANS: Record<string, { name: string; cents: number; apps: string[] }> = {
  core: { name: 'Proairetos Core', cents: PLAN_PRICES.core, apps: ['core'] },
  coreyear: { name: 'Proairetos Core, yearly', cents: PLAN_PRICES.coreyear, apps: ['core'] },
  cloud: { name: 'Proairetos cloud sync', cents: PLAN_PRICES.cloud, apps: ['cloud'] },
};

type Fetcher = typeof fetch;

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
}

export const storeReady = (env: StoreEnv) =>
  Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_URL && env.SUPABASE_ANON_KEY);

const base = (env: StoreEnv) => env.SUPABASE_URL!.trim().replace(/(\/rest\/v1)?\/*$/, '');

/** The signed-in person, from their own access token. */
async function personFrom(request: Request, env: StoreEnv, fetcher: Fetcher): Promise<{ id: string; email?: string; createdAt?: string } | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const response = await fetcher(`${base(env)}/auth/v1/user`, { headers: { authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY! } });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string; email?: string; created_at?: string };
  return user.id ? { id: user.id, email: user.email, createdAt: user.created_at } : null;
}

/** Kept as a compatibility seam for old callers. Beta access is now always time-limited in `beta_access`. */
export function isTester(env: StoreEnv, email: string | undefined): boolean {
  void env;
  void email;
  return false;
}

const ownerEmails = (env: StoreEnv) => new Set([env.OWNER_EMAIL || 'boleydavid7@gmail.com', ...(env.OWNER_EMAILS ?? '').split(',')].map((email) => email.trim().toLowerCase()).filter(Boolean));
const isOwnerEmail = (env: StoreEnv, email: string | undefined) => Boolean(email && ownerEmails(env).has(email.trim().toLowerCase()));
const validEmail = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 254;
const betaSetupMessage = 'Run supabase/migrations/20261029000000_beta_access.sql, add SUPABASE_SERVICE_ROLE_KEY to the Worker secrets, and redeploy.';

async function temporaryExpiry(env: StoreEnv, email: string | undefined, fetcher: Fetcher): Promise<string | undefined> {
  if (!email || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_URL) return undefined;
  const query = new URLSearchParams({ email: `eq.${email.trim().toLowerCase()}`, expires_at: `gt.${new Date().toISOString()}`, select: 'expires_at', order: 'expires_at.desc', limit: '1' });
  const response = await fetcher(`${base(env)}/rest/v1/beta_access?${query}`, { headers: serviceHeaders(env) });
  if (!response.ok) return undefined;
  const rows = (await response.json()) as Array<{ expires_at?: string }>;
  return rows[0]?.expires_at;
}

/** Every new account has every app for this long from the day it was made; no card, nothing to cancel. */
export const TRIAL_DAYS = 7;

/** When the free trial ends for an account made at `createdAt`, while it is still on; else undefined. */
export function trialUntil(createdAt: string | undefined, now = Date.now()): string | undefined {
  const made = createdAt ? Date.parse(createdAt) : NaN;
  if (!Number.isFinite(made)) return undefined;
  const until = made + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return until > now ? new Date(until).toISOString() : undefined;
}

/** Tells a signed-in person whether their account is a beta tester's (nothing else about the list leaves the Worker). */
export async function mine(request: Request, env: StoreEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return reply(200, { tester: false, owner: false });
  const person = await personFrom(request, env, fetcher);
  if (!person) return reply(401, { error: 'Sign in first.' });
  const owner = isOwnerEmail(env, person.email);
  const listed = isTester(env, person.email);
  const temporary = listed ? undefined : await temporaryExpiry(env, person.email, fetcher);
  return reply(200, { tester: owner || listed || Boolean(temporary), expiresAt: temporary, owner, trialUntil: trialUntil(person.createdAt) });
}

/** Owner-only beta list. Temporary entries expire without a cleanup job. */
export async function betaAccess(request: Request, env: StoreEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return reply(503, { error: `Beta access is not set up yet. ${betaSetupMessage}` });
  const person = await personFrom(request, env, fetcher);
  if (!person || !isOwnerEmail(env, person.email)) return reply(403, { error: 'Only the owner can manage beta access.' });
  if (request.method === 'GET') {
    const query = new URLSearchParams({ expires_at: `gt.${new Date().toISOString()}`, select: 'email,expires_at', order: 'expires_at.asc' });
    const response = await fetcher(`${base(env)}/rest/v1/beta_access?${query}`, { headers: serviceHeaders(env) });
    if (!response.ok) return reply(502, { error: `The beta list could not be read. ${betaSetupMessage}` });
    return reply(200, await response.json());
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; days?: number };
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!validEmail(email)) return reply(400, { error: 'Enter a valid email address.' });
  if (request.method === 'DELETE') {
    const query = new URLSearchParams({ email: `eq.${email}` });
    const response = await fetcher(`${base(env)}/rest/v1/beta_access?${query}`, { method: 'DELETE', headers: serviceHeaders(env) });
    if (!response.ok) return reply(502, { error: 'The beta access could not be removed.' });
    return reply(200, { removed: true });
  }
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' });
  const days = 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const response = await fetcher(`${base(env)}/rest/v1/beta_access?on_conflict=email`, {
    method: 'POST',
    headers: { ...serviceHeaders(env), prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ email, expires_at: expiresAt }),
  });
  if (!response.ok) return reply(502, { error: 'The beta access could not be saved.' });
  return reply(200, { email, expires_at: expiresAt });
}

/** Owner-only, minimal account directory. The service role never leaves the Worker. */
export async function signedInUsers(request: Request, env: StoreEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return reply(503, { error: 'User directory is not set up yet.' });
  const person = await personFrom(request, env, fetcher);
  if (!person || !isOwnerEmail(env, person.email)) return reply(403, { error: 'Only the owner can view signed-in users.' });
  const query = new URLSearchParams({ page: '1', per_page: '100' });
  const response = await fetcher(`${base(env)}/auth/v1/admin/users?${query}`, { headers: serviceHeaders(env) });
  if (!response.ok) return reply(502, { error: 'The signed-in user list could not be read.' });
  const data = (await response.json()) as { users?: Array<{ email?: string; created_at?: string; last_sign_in_at?: string }> };
  const users = (data.users ?? []).map((user) => ({ email: user.email ?? '', created_at: user.created_at ?? '', last_sign_in_at: user.last_sign_in_at ?? '' }));
  return reply(200, { users, hasMore: users.length === 100 });
}

const serviceHeaders = (env: StoreEnv) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'content-type': 'application/json',
});

async function owns(env: StoreEnv, fetcher: Fetcher, user: string, app: string): Promise<boolean> {
  const query = `user_id=eq.${encodeURIComponent(user)}&app=eq.${encodeURIComponent(app)}&active=eq.true&select=app`;
  const response = await fetcher(`${base(env)}/rest/v1/purchases?${query}`, { headers: serviceHeaders(env) });
  if (!response.ok) return false;
  return ((await response.json()) as unknown[]).length > 0;
}

async function ownsAny(env: StoreEnv, fetcher: Fetcher, user: string, apps: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const app of apps) if (await owns(env, fetcher, user, app)) found.push(app);
  return found;
}

/** The person's share link, and whether they have earned the discount (put on their plan here if they are subscribed). */
export async function myReferral(request: Request, env: StoreEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (!referralsOn(env) || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return reply(200, { available: false });
  const person = await personFrom(request, env, fetcher);
  if (!person) return reply(401, { error: 'Sign in first.' });
  const code = await referralCode(env, person.id);
  let credit = await creditOf(env, fetcher, person.id);
  if (credit && !credit.applied && (await applyCredit(env, fetcher, person.id))) credit = { ...credit, applied: true };
  return reply(200, { available: true, code, earned: Boolean(credit), applied: Boolean(credit?.applied) });
}

/** Starts Stripe Checkout for the family plan or Proairetos cloud. */
export async function startCheckout(request: Request, env: StoreEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (!storeReady(env)) return reply(503, { error: 'The Store is not taking payments yet.' });
  const body = (await request.json().catch(() => ({}))) as { app?: string; ref?: string };
  const requested = String(body.app ?? '');
  // Old links for Soma, Phyton and their bundle now lead to the single family plan.
  const app = ['soma', 'phyton', 'bundle'].includes(requested) ? 'core' : requested;
  const plan = STORE_PLANS[app];
  if (!plan) return reply(400, { error: 'That is not a plan in the Store.' });
  const person = await personFrom(request, env, fetcher);
  if (!person) return reply(401, { error: 'Sign in to buy an app.' });
  const owner = isOwnerEmail(env, person.email);
  const tester = !owner && (isTester(env, person.email) || Boolean(await temporaryExpiry(env, person.email, fetcher)));
  if (owner || (tester && app !== 'cloud')) return reply(200, { owned: true, tester });
  if (tester && app === 'cloud') return reply(403, { error: 'Beta access includes the apps, but not Proairetos cloud. Choose local or your own cloud storage.' });
  const existing = await ownsAny(env, fetcher, person.id, ['core', 'soma', 'phyton', 'cloud']);
  if (existing.includes(plan.apps[0])) return reply(200, { owned: true });
  const cents = plan.cents;
  const purchaseApps = plan.apps;
  const origin = new URL(request.url).origin;
  const form = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': CURRENCY,
    'line_items[0][price_data][unit_amount]': String(cents),
    'line_items[0][price_data][recurring][interval]': app === 'coreyear' ? 'year' : 'month',
    'line_items[0][price_data][product_data][name]': `${plan.name} by Proairetos`,
    client_reference_id: person.id,
    'metadata[app]': app,
    'metadata[plan]': app,
    'metadata[apps]': purchaseApps.join(','),
    'metadata[user]': person.id,
    success_url: `${origin}/?open=settings:store#bought=${plan.apps[0]}`,
    cancel_url: `${origin}/?open=settings:store`,
  });
  form.set('subscription_data[metadata][app]', app);
  form.set('subscription_data[metadata][apps]', purchaseApps.join(','));
  form.set('subscription_data[metadata][user]', person.id);
  if (person.email) form.set('customer_email', person.email);
  // Sharing: a code from the person who sent them earns that person a discount (below, once this payment is in), and a
  // credit this person has earned comes off their own first payment.
  if (plan.apps[0] === 'core' && referralsOn(env)) {
    const referrer = await readReferral(env, body.ref);
    if (referrer && (await usable(env, fetcher, referrer, person.id))) {
      form.set('metadata[referrer]', referrer);
      form.set('subscription_data[metadata][referrer]', referrer);
    }
    const credit = await creditOf(env, fetcher, person.id);
    if (credit && !credit.applied) {
      try {
        await ensureCoupon(env, fetcher);
        form.set('discounts[0][coupon]', REFERRAL_COUPON);
        form.set('metadata[credit]', credit.id);
      } catch {
        // The discount waits; the payment page still opens.
      }
    }
  }
  const response = await fetcher('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const session = (await response.json().catch(() => ({}))) as { url?: string };
  if (!response.ok || !session.url) return reply(502, { error: 'The payment page did not open. Try again in a minute.' });
  return reply(200, { url: session.url });
}

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** Stripe's signature: HMAC-SHA256 of "t.body" with the webhook secret, within five minutes. */
export async function stripeSigned(payload: string, header: string | null, secret: string, now = Date.now()): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(',').map((part) => part.trim().split('='));
  const time = Number(parts.find(([key]) => key === 't')?.[1]);
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!time || !signatures.length || Math.abs(now / 1000 - time) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${time}.${payload}`)));
  return signatures.some((signature) => signature.length === expected.length && signature === expected);
}

type CheckoutSession = {
  id?: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  subscription?: string;
  client_reference_id?: string;
  metadata?: { app?: string; apps?: string; user?: string; referrer?: string; credit?: string };
};

type Subscription = {
  id?: string;
  status?: string;
  current_period_end?: number;
  metadata?: { app?: string; apps?: string; user?: string };
};

/** Records a paid checkout as the person's purchase (once; a repeat of the same event changes nothing). */
export async function handleWebhook(request: Request, env: StoreEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (!storeReady(env)) return reply(503, { error: 'Not set up.' });
  const payload = await request.text();
  if (!(await stripeSigned(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET!))) return reply(400, { error: 'Bad signature.' });
  const event = JSON.parse(payload) as { type?: string; data?: { object?: CheckoutSession | Subscription } };
  const object = event.data?.object;
  if (!object) return reply(200, { received: true });
  if (event.type?.startsWith('customer.subscription.')) {
    const subscription = object as Subscription;
    if (!subscription.id) return reply(200, { received: true, skipped: true });
    const active = ['active', 'trialing', 'past_due'].includes(subscription.status ?? '');
    const query = `subscription_id=eq.${encodeURIComponent(subscription.id)}`;
    const response = await fetcher(`${base(env)}/rest/v1/purchases?${query}`, {
      method: 'PATCH',
      headers: { ...serviceHeaders(env), prefer: 'return=minimal' },
      body: JSON.stringify({ active, current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) return reply(500, { error: 'Could not update the subscription.' });
    return reply(200, { received: true });
  }
  const checkout = object as CheckoutSession;
  const paid = event.type === 'checkout.session.async_payment_succeeded' || (event.type === 'checkout.session.completed' && checkout.payment_status === 'paid');
  if (!paid) return reply(200, { received: true });
  const session = object as CheckoutSession;
  const app = session.metadata?.app ?? '';
  const user = session.metadata?.user ?? session.client_reference_id ?? '';
  const plan = STORE_PLANS[app];
  if (!plan || !user || !session.id) return reply(200, { received: true, skipped: true });
  const apps = (session.metadata?.apps ?? plan.apps.join(',')).split(',').filter(Boolean);
  const subscriptionId = session.subscription ?? undefined;
  const rows = apps.map((ownedApp) => ({ user_id: user, app: ownedApp, session_id: `${session.id}:${ownedApp}`, subscription_id: subscriptionId, active: true, current_period_end: null, amount: session.amount_total ?? plan.cents, currency: session.currency ?? CURRENCY }));
  const response = await fetcher(`${base(env)}/rest/v1/purchases?on_conflict=user_id,app`, {
    method: 'POST',
    headers: { ...serviceHeaders(env), prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  // A failure here makes Stripe send the event again later.
  if (!response.ok) return reply(500, { error: 'Could not record the purchase.' });
  // Sharing never makes the webhook fail: what cannot be done now is done when the sharer next opens the Store.
  try {
    if (session.metadata?.credit) await markApplied(env, fetcher, session.metadata.credit);
    const referrer = session.metadata?.referrer;
    if (referrer && referralsOn(env) && (await keepReferral(env, fetcher, referrer, user, session.id))) await applyCredit(env, fetcher, referrer);
  } catch {
    // Left for later.
  }
  return reply(200, { received: true });
}

export async function handleStoreRequest(request: Request, env: StoreEnv): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/api/store' && request.method === 'GET')
    return reply(200, { paid: storeReady(env), prices: PLAN_PRICES, price: PLAN_PRICES.core, currency: CURRENCY });
  if (path === '/api/store/mine' && request.method === 'GET') return mine(request, env);
  if (path === '/api/store/beta' && ['GET', 'POST', 'DELETE'].includes(request.method)) return betaAccess(request, env);
  if (path === '/api/store/users' && request.method === 'GET') return signedInUsers(request, env);
  if (path === '/api/store/referral' && request.method === 'GET') return myReferral(request, env);
  if (path === '/api/store/checkout' && request.method === 'POST') return startCheckout(request, env);
  if (path === '/api/store/webhook' && request.method === 'POST') return handleWebhook(request, env);
  return reply(404, { error: 'Not found.' });
}
