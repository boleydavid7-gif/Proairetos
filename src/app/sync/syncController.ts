import { createSyncEngine, type SyncResult } from '../../data/sync/engine';
import { KeyError, createKeys, unlockWithPassphrase, unlockWithRecoveryKey, type KeySetup } from '../../data/sync/keys';
import { createIndexedDbLocalSyncStore, createIndexedDbSyncStateStore } from '../../data/sync/localStores';
import {
  calendarFeedUrl,
  createSupabaseRemoteStore,
  currentUser,
  deleteCalendarFeed,
  deleteRemoteAccount,
  fetchCalendarFeedToken,
  publishCalendarFeed,
  updateCalendarFeed,
  fetchWrappedKeys,
  isSyncConfigured,
  removePushSubscription,
  replaceReminders,
  saveWrappedKeys,
  savePushSubscription,
  sendSignInCode,
  signOutRemote,
  syncConfig,
  verifySignInCode,
  verifySignInLink,
} from '../../data/sync/supabase';
import type { SyncStateStore } from '../../data/sync/types';
import { createListeners } from '../../services/listeners';
import {
  compassService,
  decisionService,
  deviceDatabase,
  lifeService,
  reflectionService,
  scheduleService,
} from '../services';
import { upcomingReminders } from './reminders';
import { buildCalendarFile } from './calendarFile';
import { otherCalendars } from '../calendars/otherCalendars';
import { loadCalendarFeed, loadQuietHours, saveCalendarFeed, type StoredFeedOptions } from '../../data/storage/preferences';

export type SyncPhase =
  | 'unavailable' // not configured, or storage blocked
  | 'signed-out'
  | 'needs-setup' // signed in, no key anywhere yet
  | 'locked' // signed in, key exists on the server but not on this device
  | 'ready';

export type SyncStatus = {
  phase: SyncPhase;
  email?: string;
  syncing: boolean;
  lastSyncedAt?: string;
  error?: string;
  reminders: 'unsupported' | 'off' | 'on' | 'blocked';
};

const KEY_META = 'dataKey';
const LAST_SYNC_META = 'lastSyncedAt';
const REMINDERS_META = 'remindersEndpoint';
const AUTO_SYNC_MS = 2 * 60_000;
const AFTER_CHANGE_MS = 4_000;

const listeners = createListeners();
let status: SyncStatus = { phase: 'unavailable', syncing: false, reminders: 'unsupported' };
let dataKey: CryptoKey | null = null;
let userId: string | null = null;
let state: SyncStateStore | null = null;
let started = false;
let changeTimer: number | undefined;
let applyingRemote = false;

function set(changes: Partial<SyncStatus>) {
  status = { ...status, ...changes };
  listeners.notify();
}

function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && Boolean(syncConfig.vapidPublicKey);
}

async function localState(): Promise<SyncStateStore | null> {
  if (state) return state;
  const db = await deviceDatabase;
  state = db ? createIndexedDbSyncStateStore(Promise.resolve(db)) : null;
  return state;
}

async function remindersPhase(): Promise<SyncStatus['reminders']> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return (await (await localState())?.getMeta<string>(REMINDERS_META)) ? 'on' : 'off';
}

async function resolvePhase(): Promise<void> {
  if (!isSyncConfigured || !(await localState())) return set({ phase: 'unavailable' });
  const user = await currentUser().catch(() => null);
  if (!user) {
    userId = null;
    return set({ phase: 'signed-out', email: undefined });
  }
  userId = user.id;
  const st = (await localState())!;
  dataKey = (await st.getMeta<CryptoKey>(KEY_META)) ?? null;
  const lastSyncedAt = await st.getMeta<string>(LAST_SYNC_META);
  const reminders = await remindersPhase();
  if (dataKey) return set({ phase: 'ready', email: user.email, lastSyncedAt, reminders });
  const wrapped = await fetchWrappedKeys().catch(() => null);
  set({ phase: wrapped ? 'locked' : 'needs-setup', email: user.email, reminders });
}

function refreshScreens() {
  for (const service of [lifeService, reflectionService, compassService, scheduleService, decisionService]) service.refresh();
}

/** Recomputes reminder times, e.g. after quiet hours change. */
export function refreshReminders(): Promise<void> {
  return updateReminders().catch(() => undefined);
}

async function updateReminders() {
  if (!userId || status.reminders !== 'on') return;
  const [items, decisions] = await Promise.all([lifeService.list(), decisionService.list()]);
  const now = new Date();
  const until = new Date(now.getTime() + 15 * 86_400_000);
  const blocks = [...(await scheduleService.occurrencesBetween(now, until)), ...otherCalendars.blocksBetween(now, until)];
  await replaceReminders(userId, await upcomingReminders(items, decisions, now, { quiet: loadQuietHours(), blocks }));
}

export async function syncNow(): Promise<SyncResult | null> {
  if (status.phase !== 'ready' || !dataKey || !userId || !navigator.onLine) return null;
  const db = await deviceDatabase;
  if (!db) return null;
  set({ syncing: true, error: undefined });
  try {
    const engine = createSyncEngine({
      local: createIndexedDbLocalSyncStore(Promise.resolve(db)),
      state: (await localState())!,
      remote: createSupabaseRemoteStore(userId),
      key: dataKey,
    });
    const result = await engine.sync();
    const lastSyncedAt = new Date().toISOString();
    await (await localState())!.setMeta(LAST_SYNC_META, lastSyncedAt);
    if (result.pulled > 0) {
      applyingRemote = true;
      refreshScreens();
      applyingRemote = false;
    }
    await updateReminders().catch(() => undefined);
    await refreshCalendarFeed().catch(() => undefined);
    set({ syncing: false, lastSyncedAt });
    return result;
  } catch (error) {
    set({ syncing: false, error: error instanceof Error ? error.message : 'Sync could not finish. It will try again.' });
    return null;
  }
}

/** Starts watching for changes. Safe to call more than once. */
export async function startSync(): Promise<void> {
  if (started) return;
  started = true;
  await resolvePhase();
  if (status.phase === 'ready') void syncNow();

  // After any local change, sync shortly after things settle.
  for (const service of [lifeService, reflectionService, compassService, scheduleService, decisionService]) {
    service.subscribe(() => {
      if (applyingRemote || status.phase !== 'ready') return;
      window.clearTimeout(changeTimer);
      changeTimer = window.setTimeout(() => void syncNow(), AFTER_CHANGE_MS);
    });
  }
  window.setInterval(() => document.visibilityState === 'visible' && void syncNow(), AUTO_SYNC_MS);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void syncNow());
  window.addEventListener('online', () => void syncNow());
}

export const syncStatus = {
  subscribe: listeners.subscribe,
  get: () => status,
};

// ---------- Account steps ----------

export async function requestCode(email: string): Promise<void> {
  await sendSignInCode(email.trim());
}

/** Accepts either the 6-digit code or the sign-in link from the email. */
export async function confirmCode(email: string, codeOrLink: string): Promise<void> {
  const value = codeOrLink.trim();
  if (/^https?:\/\//i.test(value)) await verifySignInLink(value);
  else await verifySignInCode(email.trim(), value);
  // Opening the link in this browser leaves tokens in the address; tidy it.
  if (location.hash.includes('access_token')) history.replaceState(history.state, '', location.pathname);
  await resolvePhase();
  if (status.phase === 'ready') void syncNow();
}

/**
 * First device, step 1: creates the keys in memory only, so the recovery key
 * can be shown. Nothing is saved or uploaded yet.
 */
export function prepareEncryption(passphrase: string): Promise<KeySetup> {
  return createKeys(passphrase);
}

/**
 * Step 2, after the person confirms they wrote the recovery key down:
 * uploads the wrapped keys, keeps the key on this device, and starts syncing.
 */
export async function confirmEncryption(setup: KeySetup): Promise<void> {
  await saveWrappedKeys(setup.passphraseWrap, setup.recoveryWrap);
  await (await localState())!.setMeta(KEY_META, setup.dataKey);
  dataKey = setup.dataKey;
  set({ phase: 'ready' });
  await syncNow();
}

export async function unlock(secret: string, method: 'passphrase' | 'recovery'): Promise<void> {
  const wrapped = await fetchWrappedKeys();
  if (!wrapped) throw new KeyError('No encrypted data was found for this account.');
  const key =
    method === 'passphrase'
      ? await unlockWithPassphrase(wrapped.passphrase, secret)
      : await unlockWithRecoveryKey(wrapped.recovery, secret);
  await (await localState())!.setMeta(KEY_META, key);
  dataKey = key;
  set({ phase: 'ready' });
  await syncNow();
}

/** Signs out and forgets the key on this device. Local data stays. */
export async function signOut(): Promise<void> {
  await disableReminders().catch(() => undefined);
  await signOutRemote().catch(() => undefined);
  await (await localState())?.clear();
  dataKey = null;
  userId = null;
  set({ phase: 'signed-out', email: undefined, lastSyncedAt: undefined, error: undefined });
}

/**
 * Deletes the account and everything on the server, then signs this device
 * out. What is on this device stays here.
 */
export async function deleteAccount(): Promise<void> {
  if (status.phase === 'unavailable' || status.phase === 'signed-out') throw new Error('Not signed in.');
  await deleteRemoteAccount();
  saveCalendarFeed({ ...loadCalendarFeed(), enabled: false });
  await signOut();
}

// ---------- Reminders ----------

function vapidKey(): Uint8Array<ArrayBuffer> {
  const base64 = syncConfig.vapidPublicKey!.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function enableReminders(): Promise<void> {
  if (!pushSupported() || !userId) throw new Error('Reminders are not available here.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    set({ reminders: permission === 'denied' ? 'blocked' : 'off' });
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() }));
  await savePushSubscription(subscription.toJSON(), userId);
  await (await localState())!.setMeta(REMINDERS_META, subscription.endpoint);
  set({ reminders: 'on' });
  await updateReminders();
}

export async function disableReminders(): Promise<void> {
  const st = await localState();
  const endpoint = await st?.getMeta<string>(REMINDERS_META);
  if (endpoint) {
    await removePushSubscription(endpoint).catch(() => undefined);
    const registration = await navigator.serviceWorker?.ready;
    await (await registration?.pushManager.getSubscription())?.unsubscribe();
    await st!.setMeta(REMINDERS_META, null);
  }
  if (userId) await replaceReminders(userId, []).catch(() => undefined);
  set({ reminders: pushSupported() ? 'off' : 'unsupported' });
}

// ---------- Calendar subscription ----------
// Optional. The calendar file the person chose to publish is the one thing
// the server can read; everything else stays encrypted.

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Rebuilds the feed's file after a sync, if this device has it on. The
 * server's current link is the truth: if the feed was turned off or given a
 * new link on another device, this never brings an old one back.
 */
export async function refreshCalendarFeed(): Promise<void> {
  const feed = loadCalendarFeed();
  if (!feed.enabled || status.phase !== 'ready' || !userId || !navigator.onLine) return;
  const token = await fetchCalendarFeedToken();
  if (!token) {
    saveCalendarFeed({ ...feed, enabled: false });
    return;
  }
  const updated = await updateCalendarFeed(userId, token, await buildCalendarFile(feed.options));
  if (!updated) saveCalendarFeed({ ...feed, enabled: false });
}

/** Turns the feed on and returns its link. A link already in use (from another device) is kept. */
export async function enableCalendarFeed(options: StoredFeedOptions): Promise<string> {
  if (status.phase !== 'ready' || !userId) throw new Error('Turn on sync first, in Account and sync.');
  const token = (await fetchCalendarFeedToken()) ?? newToken();
  await publishCalendarFeed(userId, token, await buildCalendarFile(options));
  // Marked on only once the file is really published.
  saveCalendarFeed({ enabled: true, options });
  return calendarFeedUrl(token);
}

/** The current link, read from the server so a link renewed elsewhere shows correctly. */
export async function calendarFeedLink(): Promise<string | null> {
  if (!loadCalendarFeed().enabled || status.phase !== 'ready') return null;
  const token = await fetchCalendarFeedToken();
  if (!token) {
    saveCalendarFeed({ ...loadCalendarFeed(), enabled: false });
    return null;
  }
  return calendarFeedUrl(token);
}

/** A fresh link; the old one stops working, so calendars holding it no longer update. */
export async function renewCalendarFeedLink(): Promise<string> {
  if (status.phase !== 'ready' || !userId) throw new Error('Turn on sync first, in Account and sync.');
  const token = newToken();
  await publishCalendarFeed(userId, token, await buildCalendarFile(loadCalendarFeed().options));
  return calendarFeedUrl(token);
}

/** Deletes the published file; subscribed calendars stop updating. */
export async function disableCalendarFeed(): Promise<void> {
  const feed = loadCalendarFeed();
  if (userId) await deleteCalendarFeed(userId);
  saveCalendarFeed({ ...feed, enabled: false });
}
