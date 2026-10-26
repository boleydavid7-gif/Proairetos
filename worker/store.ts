/*
 * The Store's payments: each add-on is bought once ($4.99), through Stripe's own checkout page, and kept with the
 * person's account in the `purchases` table (migration 20261025000000_purchases.sql), so it follows them to every
 * device. Proairetos itself stays free.
 *
 *   GET  /api/store            whether paying is set up, and the price
 *   POST /api/store/checkout   { app } with the person's sign-in → a Stripe Checkout address
 *   POST /api/store/webhook    Stripe tells us a payment went through; the purchase is recorded
 *
 * Secrets (wrangler secret put …): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY. Variables:
 * SUPABASE_URL, SUPABASE_ANON_KEY (already set for Capture from anywhere). Until all are present the Store stays free.
 * Optional secret STORE_TESTERS: permanent beta testers' emails, comma-separated; signed in with one, every add-on is theirs.
 * The owner can also grant three-day access from Settings; those rows live in `beta_access`.
 *
 *   GET  /api/store/mine       with the person's sign-in → { tester } (whether this account is on that list)
 */

export type StoreEnv = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** Beta testers' emails, comma-separated (a Worker secret): their accounts get every add-on without paying. */
  STORE_TESTERS?: string;
  /** The only account allowed to manage temporary beta access. */
  OWNER_EMAIL?: string;
};

export const PRICE_CENTS = 499;
export const CURRENCY = 'usd';

export const STORE_APPS: Record<string, string> = {
  askesis: 'Askesis',
  soma: 'Soma',
  oikonomia: 'Oikonomia',
  hydros: 'Hydros',
  poreia: 'Poreia',
  praxis: 'Praxis',
  theoria: 'Theoria',
  diaita: 'Diaita',
  philia: 'Philia',
  ergon: 'Ergon',
  therapeia: 'Therapeia',
  dynamis: 'Dynamis',
  ktema: 'Ktema',
  phyton: 'Phyton',
  mneme: 'Mneme',
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
async function personFrom(request: Request, env: StoreEnv, fetcher: Fetcher): Promise<{ id: string; email?: string } | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const response = await fetcher(`${base(env)}/auth/v1/user`, { headers: { authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY! } });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string; email?: string };
  return user.id ? { id: user.id, email: user.email } : null;
}

/** Whether this email is on the owner's beta tester list (case and spaces ignored). */
export function isTester(env: StoreEnv, email: string | undefined): boolean {
  if (!email || !env.STORE_TESTERS) return false;
  const wanted = email.trim().toLowerCase();
  return env.STORE_TESTERS.split(/[\s,;]+/).some((entry) => entry && entry.toLowerCase() === wanted);
}

const ownerEmail = (env: StoreEnv) => (env.OWNER_EMAIL ?? 'boleydavid7@gmail.com').trim().toLowerCase();
const validEmail = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 254;

async function hasTemporaryAccess(env: StoreEnv, email: string | undefined, fetcher: Fetcher): Promise<boolean> {
  if (!email || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_URL) return false;
  const query = new URLSearchParams({ email: `eq.${email.trim().toLowerCase()}`, expires_at: `gt.${new Date().toISOString()}`, select: 'email', limit: '1' });
  const response = await fetcher(`${base(env)}/rest/v1/beta_access?${query}`, { headers: serviceHeaders(env) });
  if (!response.ok) return false;
  return ((await response.json()) as unknown[]).length > 0;
}

/** Tells a signed-in person whether their account is a beta tester's (nothing else about the list leaves the Worker). */
export async function mine(request: Request, env: StoreEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return reply(200, { tester: false });
  const person = await personFrom(request, env, fetcher);
  if (!person) return reply(401, { error: 'Sign in first.' });
  const tester = isTester(env, person.email) || (await hasTemporaryAccess(env, person.email, fetcher));
  return reply(200, { tester });
}

/** Owner-only beta list. Temporary entries expire without a cleanup job. */
export async function betaAccess(request: Request, env: StoreEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return reply(503, { error: 'Beta access is not set up yet.' });
  const person = await personFrom(request, env, fetcher);
  if (!person || person.email?.trim().toLowerCase() !== ownerEmail(env)) return reply(403, { error: 'Only the owner can manage beta access.' });
  if (request.method === 'GET') {
    const query = new URLSearchParams({ expires_at: `gt.${new Date().toISOString()}`, select: 'email,expires_at', order: 'expires_at.asc' });
    const response = await fetcher(`${base(env)}/rest/v1/beta_access?${query}`, { headers: serviceHeaders(env) });
    if (!response.ok) return reply(502, { error: 'The beta list could not be read.' });
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
  const days = body.days === 3 ? 3 : 3;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const response = await fetcher(`${base(env)}/rest/v1/beta_access?on_conflict=email`, {
    method: 'POST',
    headers: { ...serviceHeaders(env), prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ email, expires_at: expiresAt }),
  });
  if (!response.ok) return reply(502, { error: 'The beta access could not be saved.' });
  return reply(200, { email, expires_at: expiresAt });
}

const serviceHeaders = (env: StoreEnv) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'content-type': 'application/json',
});

async function owns(env: StoreEnv, fetcher: Fetcher, user: string, app: string): Promise<boolean> {
  const query = `user_id=eq.${encodeURIComponent(user)}&app=eq.${encodeURIComponent(app)}&select=app`;
  const response = await fetcher(`${base(env)}/rest/v1/purchases?${query}`, { headers: serviceHeaders(env) });
  if (!response.ok) return false;
  return ((await response.json()) as unknown[]).length > 0;
}

/** Starts Stripe Checkout for one add-on; the person comes back to the Store, which adds the app once it is theirs. */
export async function startCheckout(request: Request, env: StoreEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (!storeReady(env)) return reply(503, { error: 'The Store is not taking payments yet.' });
  const body = (await request.json().catch(() => ({}))) as { app?: string };
  const app = String(body.app ?? '');
  const name = STORE_APPS[app];
  if (!name) return reply(400, { error: 'That is not an app in the Store.' });
  const person = await personFrom(request, env, fetcher);
  if (!person) return reply(401, { error: 'Sign in to buy an app.' });
  if (isTester(env, person.email) || (await owns(env, fetcher, person.id, app))) return reply(200, { owned: true });
  const origin = new URL(request.url).origin;
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': CURRENCY,
    'line_items[0][price_data][unit_amount]': String(PRICE_CENTS),
    'line_items[0][price_data][product_data][name]': `${name} by Proairetos`,
    client_reference_id: person.id,
    'metadata[app]': app,
    'metadata[user]': person.id,
    'payment_intent_data[metadata][app]': app,
    'payment_intent_data[metadata][user]': person.id,
    success_url: `${origin}/?open=settings:store#bought=${app}`,
    cancel_url: `${origin}/?open=settings:store`,
  });
  if (person.email) form.set('customer_email', person.email);
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
  client_reference_id?: string;
  metadata?: { app?: string; user?: string };
};

/** Records a paid checkout as the person's purchase (once; a repeat of the same event changes nothing). */
export async function handleWebhook(request: Request, env: StoreEnv, fetcher: Fetcher = fetch): Promise<Response> {
  if (!storeReady(env)) return reply(503, { error: 'Not set up.' });
  const payload = await request.text();
  if (!(await stripeSigned(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET!))) return reply(400, { error: 'Bad signature.' });
  const event = JSON.parse(payload) as { type?: string; data?: { object?: CheckoutSession } };
  const paid = event.type === 'checkout.session.async_payment_succeeded' || (event.type === 'checkout.session.completed' && event.data?.object?.payment_status === 'paid');
  if (!paid) return reply(200, { received: true });
  const session = event.data!.object!;
  const app = session.metadata?.app ?? '';
  const user = session.metadata?.user ?? session.client_reference_id ?? '';
  if (!STORE_APPS[app] || !user || !session.id) return reply(200, { received: true, skipped: true });
  const response = await fetcher(`${base(env)}/rest/v1/purchases?on_conflict=user_id,app`, {
    method: 'POST',
    headers: { ...serviceHeaders(env), prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: user, app, session_id: session.id, amount: session.amount_total ?? PRICE_CENTS, currency: session.currency ?? CURRENCY }),
  });
  // A failure here makes Stripe send the event again later.
  if (!response.ok) return reply(500, { error: 'Could not record the purchase.' });
  return reply(200, { received: true });
}

export async function handleStoreRequest(request: Request, env: StoreEnv): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/api/store' && request.method === 'GET')
    return reply(200, { paid: storeReady(env), price: PRICE_CENTS, currency: CURRENCY });
  if (path === '/api/store/mine' && request.method === 'GET') return mine(request, env);
  if (path === '/api/store/beta' && ['GET', 'POST', 'DELETE'].includes(request.method)) return betaAccess(request, env);
  if (path === '/api/store/checkout' && request.method === 'POST') return startCheckout(request, env);
  if (path === '/api/store/webhook' && request.method === 'POST') return handleWebhook(request, env);
  return reply(404, { error: 'Not found.' });
}
