import { useSyncExternalStore } from 'react';
import type { AddOn } from './added';
import { apiUrl } from '../apiBase';

/*
 * The Store's payments, on the device side. Proairetos is free. The service-free family is one monthly Core Apps
 * subscription; Soma, Phyton and Proairetos cloud are separate monthly subscriptions. Entitlements live with the
 * signed-in account and are refreshed whenever the Store or an app starts.
 *
 * Two small device-only caches let the apps decide at once, offline too: whether the Store takes payments and what
 * this account owns. Their keys sit outside `proairetos.` so they are neither synced nor backed up; the account is
 * asked again whenever the Store opens or sync is ready.
 */

const STORE_KEY = 'proairetosStore';
const OWNED_KEY = 'proairetosOwned';

type StoreInfo = { paid: boolean; prices?: Record<string, number>; price?: number; currency: string };

export type PurchaseItem = 'core' | 'soma' | 'phyton' | 'bundle' | 'cloud';
export const CORE_APPS = ['askesis', 'oikonomia', 'poreia', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'mneme', 'praxis'] as const;

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: decided again next time.
  }
  changed();
}

/** Whether add-ons cost money right now (as last heard from the server). */
export const storePaid = (): boolean => readJson<StoreInfo>(STORE_KEY)?.paid === true;

/** A plan price in the person's own way of writing money. */
export function priceText(item: PurchaseItem | string = 'core'): string {
  const info = readJson<StoreInfo>(STORE_KEY);
  const cents = info?.prices?.[item] ?? ({ core: 999, soma: 399, phyton: 399, bundle: 699, cloud: 299 }[item] ?? info?.price ?? 999);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: (info?.currency ?? 'usd').toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

type Owned = { apps: string[]; tester?: boolean; betaExpiresAt?: string; owner?: boolean };

export const ownedApps = (): string[] => {
  const apps = readJson<Owned>(OWNED_KEY)?.apps ?? [];
  return apps.includes('core') ? [...new Set([...apps, ...CORE_APPS])] : apps;
};

/** Whether this account is on the owner's beta tester list (every add-on without paying). */
export const isTester = (): boolean => {
  const owned = readJson<Owned>(OWNED_KEY);
  if (!owned?.tester) return false;
  return !owned.betaExpiresAt || Date.parse(owned.betaExpiresAt) > Date.now();
};

export const isOwner = (): boolean => readJson<Owned>(OWNED_KEY)?.owner === true;

export const betaExpiresAt = (): string | undefined => readJson<Owned>(OWNED_KEY)?.betaExpiresAt;

/** Whether this add-on may be used: always while the Store is free or for a beta tester, else once it is bought. */
export const mayUse = (app: AddOn | string): boolean => isOwner() || isTester() || ownedApps().includes(app);

/** Cloud sync is deliberately excluded from beta access. */
export const mayUseCloud = (): boolean => isOwner() || (storePaid() && ownedApps().includes('cloud'));

/** Asks the Worker whether this account is a beta tester's; keeps what was known when it cannot say. */
async function askAccess(token: string | undefined): Promise<{ tester: boolean; expiresAt?: string; owner: boolean }> {
  if (!token) return { tester: false, owner: false };
  try {
    const response = await fetch(apiUrl('/api/store/mine'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) return { tester: isTester(), expiresAt: betaExpiresAt(), owner: isOwner() };
    const body = (await response.json()) as { tester?: boolean; expiresAt?: string; owner?: boolean };
    return { tester: body.tester === true, expiresAt: body.expiresAt, owner: body.owner === true };
  } catch {
    return { tester: isTester(), expiresAt: betaExpiresAt(), owner: isOwner() };
  }
}

/** Asks the server whether the Store takes payments. */
export async function refreshStore(): Promise<void> {
  try {
    const response = await fetch(apiUrl('/api/store'), { cache: 'no-store' });
    if (!response.ok) return;
    const info = (await response.json()) as StoreInfo;
    if (typeof info.paid === 'boolean') writeJson(STORE_KEY, info);
  } catch {
    // Offline: keep what was known.
  }
}

/** Reads what this account owns. Signed out, nothing is owned on this device. */
export async function refreshOwned(): Promise<string[]> {
  try {
    const { isSyncConfigured, supabase, currentUser } = await import('../../data/sync/supabase');
    if (!isSyncConfigured) return ownedApps();
    const user = await currentUser();
    if (!user) {
      writeJson(OWNED_KEY, { apps: [] });
      return [];
    }
    const client = await supabase();
    const access = await askAccess((await client.auth.getSession()).data.session?.access_token);
    const { data, error } = await client.from('purchases').select('app, active, current_period_end');
    // Without the table (migration not run yet), what was bought stays as known.
    const now = Date.now();
    const wasTester = isTester();
    const apps = error
      ? ownedApps()
      : (data ?? [])
          .filter((row) => (row as { active?: boolean }).active !== false && (!(row as { current_period_end?: string }).current_period_end || Date.parse(String((row as { current_period_end: string }).current_period_end)) > now))
          .map((row) => String((row as { app: string }).app));
    writeJson(OWNED_KEY, { apps, tester: access.tester, betaExpiresAt: access.expiresAt, owner: access.owner });
    if (wasTester && !access.tester && !access.owner) {
      void import('./added').then(({ clearAddedApps }) => clearAddedApps()).catch(() => undefined);
    }
    return apps;
  } catch {
    return ownedApps();
  }
}

export class NeedsSignIn extends Error {}

/** Opens Stripe's checkout page for a plan. Returns 'owned' when the account already has it. */
export async function buy(app: PurchaseItem): Promise<'owned' | 'left'> {
  const { isSyncConfigured, supabase } = await import('../../data/sync/supabase');
  if (!isSyncConfigured) throw new NeedsSignIn('Sign in to buy an app.');
  const { data } = await (await supabase()).auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new NeedsSignIn('Sign in to buy an app.');
  const response = await fetch(apiUrl('/api/store/checkout'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ app }),
  });
  const body = (await response.json().catch(() => ({}))) as { url?: string; owned?: boolean; error?: string };
  if (response.status === 401) throw new NeedsSignIn(body.error ?? 'Sign in to buy an app.');
  if (body.owned) {
    await refreshOwned();
    return 'owned';
  }
  if (!response.ok || !body.url) throw new Error(body.error ?? 'The payment page did not open. Try again in a minute.');
  window.location.assign(body.url);
  return 'left';
}

/** The app just bought, from the address Stripe sends the person back to (#bought=APP), taken once. */
export function takeBought(): string | null {
  try {
    const match = window.location.hash.match(/(?:^#|&)bought=([a-z]+)/);
    if (!match) return null;
    history.replaceState(history.state, '', window.location.pathname + window.location.search);
    return match[1];
  } catch {
    return null;
  }
}

/** Waits for the purchase to be recorded (Stripe tells the server a moment after the person returns). */
export async function waitForPurchase(app: string, tries = 8, gap = 1500): Promise<boolean> {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    if ((await refreshOwned()).includes(app) || (app === 'bundle' && ownedApps().includes('soma') && ownedApps().includes('phyton')) || (app === 'core' && CORE_APPS.every((each) => ownedApps().includes(each))) || (app === 'cloud' && mayUseCloud()) || isTester() || isOwner()) return true;
    await new Promise((done) => setTimeout(done, gap));
  }
  return false;
}

export function subscribePurchases(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => (event.key === STORE_KEY || event.key === OWNED_KEY || event.key === null) && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const snapshot = () => `${storePaid() ? 'paid' : 'free'}|${isTester() ? 'tester' : ''}|${isOwner() ? 'owner' : ''}|${ownedApps().join(',')}`;

/** Follows the Store's state: whether it takes payments, what the account owns and whether it is a beta tester's. */
export function usePurchases(): { paid: boolean; owned: string[]; tester: boolean; owner: boolean } {
  const value = useSyncExternalStore(subscribePurchases, snapshot);
  const [mode, tester, owner, apps] = value.split('|');
  return { paid: mode === 'paid', tester: tester === 'tester', owner: owner === 'owner', owned: apps ? apps.split(',') : [] };
}
