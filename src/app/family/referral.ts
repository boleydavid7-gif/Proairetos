import { apiUrl } from '../apiBase';

/*
 * Sharing Proairetos (worker/referrals.ts). A link carries `?ref=CODE`: the code is kept on this device, out of the
 * address, until the person pays for Core, when it goes with the checkout. The sharer's own link and the state of their
 * discount come from the Worker; nothing about who shared with whom is kept here.
 */
const KEY = 'proairetosRef';

/** Takes `?ref=` out of the address and keeps it on this device. */
export function keepReferralFromAddress(): void {
  try {
    const params = new URLSearchParams(location.search);
    const code = params.get('ref');
    if (!code) return;
    if (code.length <= 80) localStorage.setItem(KEY, code);
    params.delete('ref');
    const rest = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
  } catch {
    // Storage or history blocked: the link simply is not kept.
  }
}

export function heldReferral(): string | undefined {
  try {
    return localStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export type MyReferral = { link: string; earned: boolean; applied: boolean };

/** The signed-in person's share link and discount, or nothing where sharing is not set up. */
export async function myReferral(): Promise<MyReferral | undefined> {
  try {
    const { isSyncConfigured, supabase } = await import('../../data/sync/supabase');
    if (!isSyncConfigured) return undefined;
    const token = (await (await supabase()).auth.getSession()).data.session?.access_token;
    if (!token) return undefined;
    const response = await fetch(apiUrl('/api/store/referral'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) return undefined;
    const body = (await response.json()) as { available?: boolean; code?: string; earned?: boolean; applied?: boolean };
    if (!body.available || !body.code) return undefined;
    return { link: `${location.origin}/?ref=${body.code}`, earned: Boolean(body.earned), applied: Boolean(body.applied) };
  } catch {
    return undefined;
  }
}
