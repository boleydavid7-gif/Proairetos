import { useSyncExternalStore } from 'react';
import type { AddOn } from './added';
import { apiUrl } from '../apiBase';

/*
 * The Store's payments, on the device side. Proairetos is free; each add-on is bought once ($4.99) and kept with the
 * person's account (table `purchases`, read here through their own sign-in), so it follows them to every device.
 * Until the server takes payments (`/api/store` says so) every add-on stays free, as before.
 *
 * Two small device-only caches let the apps decide at once, offline too: whether the Store takes payments and what
 * this account owns. Their keys sit outside `proairetos.` so they are neither synced nor backed up; the account is
 * asked again whenever the Store opens or sync is ready.
 */

const STORE_KEY = 'proairetosStore';
const OWNED_KEY = 'proairetosOwned';

type StoreInfo = { paid: boolean; price: number; currency: string };

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

/** "$4.99" in the person's own way of writing money. */
export function priceText(): string {
  const info = readJson<StoreInfo>(STORE_KEY);
  const cents = info?.price ?? 499;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: (info?.currency ?? 'usd').toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

type Owned = { apps: string[]; tester?: boolean };

export const ownedApps = (): string[] => readJson<Owned>(OWNED_KEY)?.apps ?? [];

/** Whether this account is on the owner's beta tester list (every add-on without paying). */
export const isTester = (): boolean => readJson<Owned>(OWNED_KEY)?.tester === true;

/** Whether this add-on may be used: always while the Store is free or for a beta tester, else once it is bought. */
export const mayUse = (app: AddOn | string): boolean => !storePaid() || isTester() || ownedApps().includes(app);

/** Asks the Worker whether this account is a beta tester's; keeps what was known when it cannot say. */
async function askTester(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const response = await fetch(apiUrl('/api/store/mine'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) return isTester();
    return ((await response.json()) as { tester?: boolean }).tester === true;
  } catch {
    return isTester();
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
    const tester = await askTester((await client.auth.getSession()).data.session?.access_token);
    const { data, error } = await client.from('purchases').select('app');
    // Without the table (migration not run yet), what was bought stays as known.
    const apps = error ? ownedApps() : (data ?? []).map((row) => String((row as { app: string }).app));
    writeJson(OWNED_KEY, { apps, tester });
    return apps;
  } catch {
    return ownedApps();
  }
}

export class NeedsSignIn extends Error {}

/** Opens Stripe's checkout page for one add-on. Returns 'owned' when the account already has it. */
export async function buy(app: AddOn): Promise<'owned' | 'left'> {
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
    if ((await refreshOwned()).includes(app) || isTester()) return true;
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

const snapshot = () => `${storePaid() ? 'paid' : 'free'}|${isTester() ? 'tester' : ''}|${ownedApps().join(',')}`;

/** Follows the Store's state: whether it takes payments, what the account owns and whether it is a beta tester's. */
export function usePurchases(): { paid: boolean; owned: string[]; tester: boolean } {
  const value = useSyncExternalStore(subscribePurchases, snapshot);
  const [mode, tester, apps] = value.split('|');
  return { paid: mode === 'paid', tester: tester === 'tester', owned: apps ? apps.split(',') : [] };
}
