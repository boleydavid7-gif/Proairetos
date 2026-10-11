import { createSyncEngine, type SyncResult } from '../../data/sync/engine';
import { familyWorker } from '../notify/familyWorker';
import { KeyError, createKeys, openBytes, sealBytes, sealNoticeWords, unlockWithPassphrase, unlockWithRecoveryKey, type KeySetup } from '../../data/sync/keys';
import { createIndexedDbLocalSyncStore, createIndexedDbSyncStateStore } from '../../data/sync/localStores';
import { withDeviceRecords } from '../../data/sync/deviceRecords';
import { syncAttachmentFiles } from '../../data/sync/attachmentFiles';
import {
  calendarFeedUrl,
  createSupabaseFileStore,
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
  replaceSourceReminders,
  hasPushSubscription,
  OlderRemindersTable,
  saveWrappedKeys,
  savePushSubscription,
  sendSignInCode,
  signInWithProvider,
  type SignInProvider,
  signOutRemote,
  syncConfig,
  verifySignInCode,
  verifySignInLink,
  leaveHandoff,
  requestHandoffToken,
  signInWithHandoffToken,
  takeHandoff,
} from '../../data/sync/supabase';
import { makePass, openKeyFromPass, readPass, sealKeyForPass } from '../../data/sync/handoff';
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
import { reminderTimes } from './reminders';
import { hydrationUpcoming, upcomingNotices } from '../notify/upcoming';
import { appAt, sourceOf, sourcesToWrite, wordsOf, type ReminderSource } from '../../core/notify/sources';
import { privateNotice, type Notice } from '../../core/notify/notices';
import { buildCalendarFile } from './calendarFile';
import {
  loadCalendarFeed,
  loadNotify,
  notifyPreferences,
  saveCalendarFeed,
  subscribePreferences,
  type StoredFeedOptions,
} from '../../data/storage/preferences';
import { applyAppearance } from '../appearance';

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
  /** Records the server did not accept yet (it needs the Askesis migration). */
  held?: number;
  /** Things edited on two devices at once, where this device's version was kept. */
  kept?: number;
};

const KEY_META = 'dataKey';
/** An exportable copy of the data key, kept on this device only once the person turns on signing in other apps. */
const HANDOFF_META = 'handoffKey';
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
  // Back from Google or Apple (or the email's link opened here): the tokens are read; tidy the address.
  if (/access_token|refresh_token|error_description/.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search);
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

const remoteChanges = createListeners();

/*
 * The family, open side by side (Proairetos, Askesis, SOMA in tabs, or
 * installed apps sharing this browser's storage): a change in one shows in
 * the others at once, and so does signing in or out. Only "something
 * changed" is said; each app reads the records itself.
 */
type FamilyNote = { kind: 'changed' | 'account' };
const family: BroadcastChannel | null = typeof BroadcastChannel === 'function' ? new BroadcastChannel('proairetos-family') : null;
let familyTimer: number | undefined;

/** Tells the other open apps that records changed (shortly, once for a burst of writes). */
export function tellFamily(kind: FamilyNote['kind'] = 'changed'): void {
  if (!family) return;
  if (kind === 'account') {
    family.postMessage({ kind } satisfies FamilyNote);
    return;
  }
  window.clearTimeout(familyTimer);
  familyTimer = window.setTimeout(() => family.postMessage({ kind } satisfies FamilyNote), 300);
}

family?.addEventListener('message', (event: MessageEvent<FamilyNote>) => {
  if (event.data?.kind === 'account') {
    void resolvePhase().then(() => status.phase === 'ready' && void syncNow());
    return;
  }
  if (event.data?.kind === 'changed') {
    applyingRemote = true;
    refreshScreens();
    applyingRemote = false;
  }
});

/** Told when a sync brought changes from elsewhere (Askesis listens to reload its own records). */
/**
 * For a family app's private file (a Theoria book): seals bytes with the account's key on this device, or
 * opens bytes sealed that way. Null while the account is not ready here.
 */
export async function sealWithAccount(label: string, bytes: ArrayBuffer): Promise<{ sealed: Uint8Array<ArrayBuffer>; userId: string } | null> {
  if (!dataKey || !userId) return null;
  return { sealed: await sealBytes(dataKey, label, bytes), userId };
}

export async function openWithAccount(label: string, sealed: ArrayBuffer): Promise<ArrayBuffer | null> {
  if (!dataKey) return null;
  return openBytes(dataKey, label, sealed);
}

export function onRemoteChanges(listener: () => void): () => void {
  return remoteChanges.subscribe(listener);
}

function refreshScreens() {
  for (const service of [lifeService, reflectionService, compassService, scheduleService, decisionService]) service.refresh();
  remoteChanges.notify();
}

/** Syncs shortly after things settle; for changes made outside the services (Askesis). */
export function syncSoon(): void {
  tellFamily();
  if (status.phase !== 'ready') return;
  window.clearTimeout(changeTimer);
  changeTimer = window.setTimeout(() => void syncNow(), AFTER_CHANGE_MS);
}

/** Recomputes reminder times, e.g. after quiet hours change. */
export function refreshReminders(): Promise<void> {
  return updateReminders().catch(() => undefined);
}

/** Whether this account takes reminders somewhere: here, or on a phone where another app of the family has them on. */
let accountTakesReminders: boolean | undefined;

async function remindersWanted(): Promise<boolean> {
  if (status.reminders === 'on') return true;
  accountTakesReminders ??= await hasPushSubscription().catch(() => false);
  return accountTakesReminders;
}

const WRITTEN_KEY = 'proairetos.sync.reminderSources';

function writtenBefore(): ReminderSource[] {
  try {
    return JSON.parse(localStorage.getItem(WRITTEN_KEY) ?? '[]') as ReminderSource[];
  } catch {
    return [];
  }
}

async function updateReminders() {
  if (!userId || !dataKey || !(await remindersWanted())) return;
  const now = new Date();
  const notices: Notice[] = [...(await upcomingNotices(now)), ...(await hydrationUpcoming(now).catch(() => []))];
  const app = appAt(location.pathname);
  const sources = sourcesToWrite(app, notices, writtenBefore());
  if (sources.length === 0) return;
  const details = loadNotify().details;
  const key = dataKey;
  try {
    for (const source of sources) {
      const own = notices.filter((notice) => sourceOf(notice) === source);
      const times = await reminderTimes(own);
      const rows = await Promise.all(
        own.map(async (notice, index) => ({
          ...times[index],
          // Only the times are readable by the server; the words travel sealed with the account key.
          sealed: await sealNoticeWords(key, wordsOf(details ? notice : privateNotice(notice))),
        })),
      );
      await replaceSourceReminders(userId, source, rows);
    }
    localStorage.setItem(WRITTEN_KEY, JSON.stringify([...new Set([...writtenBefore(), ...sources])]));
  } catch (cause) {
    // A server without the newer table keeps the old way: Proairetos alone writes every time it knows.
    if (!(cause instanceof OlderRemindersTable)) throw cause;
    if (app === 'proairetos' && status.reminders === 'on') await replaceReminders(userId, await reminderTimes(notices));
  }
}

export async function syncNow(): Promise<SyncResult | null> {
  if (status.phase !== 'ready' || !dataKey || !userId || !navigator.onLine) return null;
  const db = await deviceDatabase;
  if (!db) return null;
  set({ syncing: true, error: undefined });
  try {
    const base = createIndexedDbLocalSyncStore(Promise.resolve(db));
    const engine = createSyncEngine({
      local: withDeviceRecords(base),
      state: (await localState())!,
      remote: createSupabaseRemoteStore(userId),
      key: dataKey,
    });
    const result = await engine.sync();
    // The bytes of photos and files follow the records that describe them.
    const files = await syncAttachmentFiles({
      rawList: () => base.list('attachments'),
      putWithBytes: (record) => base.put('attachments', record),
      state: (await localState())!,
      files: createSupabaseFileStore(),
      key: dataKey,
      userId,
    }).catch(() => ({ fetched: 0, sent: 0 }));
    const lastSyncedAt = new Date().toISOString();
    await (await localState())!.setMeta(LAST_SYNC_META, lastSyncedAt);
    if (result.pulled > 0 || files.fetched > 0) {
      applyingRemote = true;
      refreshScreens();
      applyAppearance();
      notifyPreferences();
      applyingRemote = false;
      tellFamily();
    }
    await updateReminders().catch(() => undefined);
    await refreshCalendarFeed().catch(() => undefined);
    set({ syncing: false, lastSyncedAt, held: result.held || undefined, kept: result.kept || undefined });
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
      if (applyingRemote) return;
      tellFamily();
      if (status.phase !== 'ready') return;
      window.clearTimeout(changeTimer);
      changeTimer = window.setTimeout(() => void syncNow(), AFTER_CHANGE_MS);
    });
  }
  // Settings changed on this device travel too.
  subscribePreferences(() => {
    if (applyingRemote || status.phase !== 'ready') return;
    window.clearTimeout(changeTimer);
    changeTimer = window.setTimeout(() => void syncNow(), AFTER_CHANGE_MS);
  });
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

/** Where each app shows its account card, so a sign-in with Google or Apple comes back to it. */
const ACCOUNT_PAGE: Record<string, string> = { proairetos: 'account', askesis: 'more', soma: 'more', oikonomia: 'more', hydros: 'settings', praxis: 'settings', theoria: 'settings', diaita: 'more', philia: 'more', ergon: 'more' };

export async function signInWith(provider: SignInProvider): Promise<void> {
  const app = appAt(location.pathname);
  const path = app === 'proairetos' ? '/' : `/${app}/`;
  await signInWithProvider(provider, `${location.origin}${path}?open=${ACCOUNT_PAGE[app]}`);
}

/** Accepts either the 6-digit code or the sign-in link from the email. */
export async function confirmCode(email: string, codeOrLink: string): Promise<void> {
  const value = codeOrLink.trim();
  if (/^https?:\/\//i.test(value)) await verifySignInLink(value);
  else await verifySignInCode(email.trim(), value);
  // Opening the link in this browser leaves tokens in the address; tidy it.
  if (location.hash.includes('access_token')) history.replaceState(history.state, '', location.pathname);
  await resolvePhase();
  tellFamily('account');
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
  if (!userId) throw new Error('This device is not signed in any more. Sign in again, then set up once more.');
  await saveWrappedKeys(userId, setup.passphraseWrap, setup.recoveryWrap);
  await (await localState())!.setMeta(KEY_META, setup.dataKey);
  dataKey = setup.dataKey;
  set({ phase: 'ready' });
  tellFamily('account');
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
  tellFamily('account');
  await syncNow();
}

// ---------- Signing in another app from Proairetos ----------

/** Whether this device can make sign-in passes without asking for the passphrase. */
export async function handoffReady(): Promise<boolean> {
  return Boolean(await (await localState())?.getMeta<CryptoKey>(HANDOFF_META));
}

/** Turns passes on here: the passphrase once, to keep an exportable copy of the key on this device. */
export async function enableHandoff(passphrase: string): Promise<void> {
  const wrapped = await fetchWrappedKeys();
  if (!wrapped) throw new KeyError('No encrypted data was found for this account.');
  const key = await unlockWithPassphrase(wrapped.passphrase, passphrase, true);
  await (await localState())!.setMeta(HANDOFF_META, key);
}

export async function disableHandoff(): Promise<void> {
  await (await localState())?.setMeta(HANDOFF_META, undefined);
}

/** A one-time pass for another app: good once, for two minutes. */
export async function makeSignInPass(): Promise<string> {
  if (status.phase !== 'ready') throw new Error('Sign in and open your data first.');
  const key = await (await localState())!.getMeta<CryptoKey>(HANDOFF_META);
  if (!key) throw new Error('Turn this on first.');
  const id = crypto.randomUUID();
  const { sealedKey, wrapKey } = await sealKeyForPass(key, id);
  await leaveHandoff(id, wrapKey);
  const tokenHash = await requestHandoffToken();
  return makePass({ id, tokenHash, sealedKey });
}

/** Signs in and opens the data here from a pass made in Proairetos. */
export async function signInWithPass(text: string): Promise<void> {
  const pass = readPass(text);
  if (!pass) throw new Error('That is not a pass from Proairetos. In Proairetos: Settings, Account, Sign in another app.');
  const user = await signInWithHandoffToken(pass.tokenHash);
  userId = user.id;
  const wrapKey = await takeHandoff(pass.id);
  if (!wrapKey) throw new Error('That pass has been used or is too old. Make a new one in Proairetos.');
  const key = await openKeyFromPass(pass.sealedKey, wrapKey, pass.id);
  await (await localState())!.setMeta(KEY_META, key);
  dataKey = key;
  set({ phase: 'ready', email: user.email });
  tellFamily('account');
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
  tellFamily('account');
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
  // On an iPhone each Home Screen app is its own receiver: when another app of the family already takes this
  // account's reminders, this one only writes its times there, so nothing arrives twice.
  if (appAt(location.pathname) !== 'proairetos' && (await hasPushSubscription().catch(() => false))) {
    accountTakesReminders = true;
    await updateReminders();
    return;
  }
  const registration = await familyWorker();
  if (!registration) throw new Error('Reminders are not available here.');
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() }));
  await savePushSubscription(subscription.toJSON(), userId);
  await (await localState())!.setMeta(REMINDERS_META, subscription.endpoint);
  accountTakesReminders = true;
  set({ reminders: 'on' });
  await updateReminders();
}

export async function disableReminders(): Promise<void> {
  const st = await localState();
  const endpoint = await st?.getMeta<string>(REMINDERS_META);
  if (endpoint) {
    await removePushSubscription(endpoint).catch(() => undefined);
    const registration = await familyWorker();
    await (await registration?.pushManager.getSubscription())?.unsubscribe();
    await st!.setMeta(REMINDERS_META, null);
  }
  if (userId) await replaceReminders(userId, []).catch(() => undefined);
  accountTakesReminders = undefined;
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
