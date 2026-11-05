/*
 * Sharing Proairetos. A subscriber has a personal link (`/?ref=CODE`). When someone who came through it pays for Core
 * (monthly or yearly), the person who shared earns 20% off their own Core plan for six months, once: one referral, no
 * stacking. The code is the sharer's id signed with `REFERRAL_SECRET`, so nothing is stored to look it up. The
 * referral itself is the `referrals` row (migration 20261110000000_referrals.sql), written by the Worker from a paid
 * checkout. The discount is a Stripe coupon (20% off, repeating for six months) put on the sharer's subscription, or on
 * their own checkout if they have not subscribed yet. A yearly plan's first invoice is the one that takes it.
 */
export type ReferralEnv = {
  REFERRAL_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_URL?: string;
};
type Fetcher = typeof fetch;

export const REFERRAL_COUPON = 'proairetos-share-20-6m';
const b64url = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes as ArrayBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
const uuidBytes = (id: string) => Uint8Array.from((id.replace(/-/g, '').match(/.{2}/g) ?? []).map((pair) => parseInt(pair, 16)));
const uuidOf = (bytes: Uint8Array) => {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))).slice(0, 12);
}

export const referralsOn = (env: ReferralEnv) => Boolean(env.REFERRAL_SECRET);

/** The sharer's code: their id and a signature over it. */
export async function referralCode(env: ReferralEnv, userId: string): Promise<string> {
  const id = b64url(uuidBytes(userId));
  return `${id}.${await sign(env.REFERRAL_SECRET!, id)}`;
}

/** The sharer behind a code, or undefined for one that was altered or made up. */
export async function readReferral(env: ReferralEnv, code: unknown): Promise<string | undefined> {
  if (!env.REFERRAL_SECRET || typeof code !== 'string') return undefined;
  const [id, signature] = code.split('.');
  if (!id || !signature || id.length > 30) return undefined;
  try {
    if ((await sign(env.REFERRAL_SECRET, id)) !== signature) return undefined;
    const bytes = fromB64url(id);
    return bytes.length === 16 ? uuidOf(bytes) : undefined;
  } catch {
    return undefined;
  }
}

const rest = (env: ReferralEnv) => `${env.SUPABASE_URL!.trim().replace(/(\/rest\/v1)?\/*$/, '')}/rest/v1`;
const service = (env: ReferralEnv) => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY!, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`, 'content-type': 'application/json' });

type Row = { id: string; referrer_id: string; referee_id: string; applied: boolean };

async function rows(env: ReferralEnv, fetcher: Fetcher, filter: string): Promise<Row[]> {
  const response = await fetcher(`${rest(env)}/referrals?${filter}&select=id,referrer_id,referee_id,applied`, { headers: service(env) });
  return response.ok ? ((await response.json()) as Row[]) : [];
}

/** The person's own credit, if someone they shared with has subscribed. */
export async function creditOf(env: ReferralEnv, fetcher: Fetcher, userId: string): Promise<Row | undefined> {
  return (await rows(env, fetcher, `referrer_id=eq.${encodeURIComponent(userId)}`))[0];
}

/** Whether a code can still earn the sharer a discount, for a new subscriber: not themselves, not already referred, the sharer's one used or not. */
export async function usable(env: ReferralEnv, fetcher: Fetcher, referrer: string, referee: string): Promise<boolean> {
  if (referrer === referee) return false;
  if ((await rows(env, fetcher, `referee_id=eq.${encodeURIComponent(referee)}`)).length) return false;
  return (await rows(env, fetcher, `referrer_id=eq.${encodeURIComponent(referrer)}`)).length === 0;
}

/** Makes the coupon once; Stripe says so when it is already there. */
export async function ensureCoupon(env: ReferralEnv, fetcher: Fetcher): Promise<void> {
  const response = await fetcher('https://api.stripe.com/v1/coupons', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id: REFERRAL_COUPON, percent_off: '20', duration: 'repeating', duration_in_months: '6', name: 'Shared Proairetos' }),
  });
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as { error?: { code?: string } };
  if (body.error?.code !== 'resource_already_exists') throw new Error('The coupon could not be made.');
}

/** Records a paid checkout that came through a code. Returns the sharer when a new referral was kept. */
export async function keepReferral(env: ReferralEnv, fetcher: Fetcher, referrer: string, referee: string, session: string): Promise<boolean> {
  if (referrer === referee) return false;
  const response = await fetcher(`${rest(env)}/referrals`, {
    method: 'POST',
    headers: { ...service(env), prefer: 'return=minimal' },
    body: JSON.stringify({ referrer_id: referrer, referee_id: referee, session_id: session }),
  });
  // A second referral for the same sharer, or a repeat of the same event, collides with a unique key: nothing to do.
  return response.ok;
}

/** Puts the discount on the sharer's Core subscription when there is one; otherwise it waits for their checkout. */
export async function applyCredit(env: ReferralEnv, fetcher: Fetcher, referrer: string): Promise<boolean> {
  try {
    const credit = await creditOf(env, fetcher, referrer);
    if (!credit || credit.applied) return false;
    const purchases = await fetcher(`${rest(env)}/purchases?user_id=eq.${encodeURIComponent(referrer)}&app=eq.core&active=eq.true&select=subscription_id`, { headers: service(env) });
    const subscription = purchases.ok ? ((await purchases.json()) as { subscription_id?: string }[])[0]?.subscription_id : undefined;
    if (!subscription) return false;
    await ensureCoupon(env, fetcher);
    const updated = await fetcher(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscription)}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'discounts[0][coupon]': REFERRAL_COUPON }),
    });
    if (!updated.ok) return false;
    await markApplied(env, fetcher, credit.id);
    return true;
  } catch {
    return false;
  }
}

export async function markApplied(env: ReferralEnv, fetcher: Fetcher, id: string): Promise<void> {
  await fetcher(`${rest(env)}/referrals?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { ...service(env), prefer: 'return=minimal' }, body: JSON.stringify({ applied: true }) });
}
