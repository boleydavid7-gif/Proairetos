import { filesBucket, type FileStore } from './attachmentFiles';
import type { EmailOtpType, SupabaseClient, User } from '@supabase/supabase-js';
import type { WrappedKey } from './keys';
import type { OutgoingRecord, RemoteRecord, RemoteStore } from './types';

/**
 * Public settings only. The anon key is safe in the browser because every
 * table is protected by row-level security; the service role key never
 * comes near the app.
 */
export const syncConfig = {
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined,
};

export const isSyncConfigured = Boolean(syncConfig.url && syncConfig.anonKey);

export type SignInProvider = 'google' | 'apple';

/** The sign-in services turned on for this site (VITE_SIGN_IN_WITH, e.g. "google,apple"); none unless set. */
export const signInProviders: SignInProvider[] = String(import.meta.env.VITE_SIGN_IN_WITH ?? '')
  .split(',')
  .map((each) => each.trim().toLowerCase())
  .filter((each): each is SignInProvider => each === 'google' || each === 'apple');

/** Leaves for Google or Apple, which send the person back to `returnTo` signed in. */
export async function signInWithProvider(provider: SignInProvider, returnTo: string): Promise<void> {
  const { error } = await (await supabase()).auth.signInWithOAuth({ provider, options: { redirectTo: returnTo } });
  if (error) throw new Error(error.message);
}

let client: Promise<SupabaseClient> | null = null;

/** Loaded only when sync is configured, so the app stays small without it. */
export function supabase(): Promise<SupabaseClient> {
  if (!isSyncConfigured) return Promise.reject(new Error('Sync is not set up for this app.'));
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(syncConfig.url!, syncConfig.anonKey!, {
      // detectSessionInUrl: opening the email's link in this browser signs in directly.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'proairetos.auth' },
    }),
  );
  return client;
}

// ---------- Unified email and password account ----------

/** Verifies a new or existing email with a one-time code, then allows the person to set a password. */
export async function setAccountPassword(password: string): Promise<void> {
  const { error } = await (await supabase()).auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

/** Signs in to the shared Proairetos account with its email and password. */
export async function signInWithPassword(email: string, password: string): Promise<User> {
  const { data, error } = await (await supabase()).auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) throw new Error(error?.message ?? 'Unable to sign in. Check your email and password.');
  return data.user;
}

/** Sends Supabase's password recovery email. */
export async function sendPasswordRecovery(email: string): Promise<void> {
  // Password recovery always returns to Proairetos' dedicated recovery screen.
  // Returning to the page that requested the email used to reopen whatever
  // account happened to be active in that app instead of the account in the
  // recovery session.
  const { error } = await (await supabase()).auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/?auth=recovery` });
  if (error) throw new Error(error.message);
}

// ---------- Sign-in by emailed code ----------
// A code, not a link: on iPhone a link opens Safari, which does not share
// storage with the app added to the Home Screen.

export async function sendSignInCode(email: string): Promise<void> {
  const { error } = await (await supabase()).auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: location.href },
  });
  if (error) throw new Error(error.message);
}

export async function verifySignInCode(email: string, code: string): Promise<User> {
  const { data, error } = await (await supabase()).auth.verifyOtp({ email, token: code.trim(), type: 'email' });
  if (error || !data.user) throw new Error(error?.message ?? 'That code did not work. Request a new one.');
  return data.user;
}

export type SignInLink =
  | { kind: 'token-hash'; tokenHash: string; type: EmailOtpType }
  | { kind: 'session'; accessToken: string; refreshToken: string };

const otpTypes: EmailOtpType[] = ['magiclink', 'signup', 'email', 'invite', 'recovery', 'email_change'];

/**
 * Reads the sign-in link from Supabase's standard email, for when the email
 * has a link instead of a code (the default when no custom email sender is
 * set up). On iPhone the link would open Safari, which does not share
 * storage with the Home Screen app, so the person copies it and pastes it.
 */
/**
 * Mail apps often wrap links in their own: Outlook's Safe Links
 * (`…safelinks.protection.outlook.com/?url=…`), Google's `/url?q=…`, and
 * similar. The real sign-in link is the one inside; unwrap until there.
 */
function unwrapLink(url: URL): URL {
  for (let round = 0; round < 4; round += 1) {
    const inner = url.searchParams.get('url') ?? url.searchParams.get('q') ?? url.searchParams.get('u');
    if (!inner || url.searchParams.has('token') || url.searchParams.has('token_hash')) return url;
    try {
      url = new URL(inner);
    } catch {
      return url;
    }
  }
  return url;
}

export function parseSignInLink(text: string): SignInLink | null {
  let url: URL;
  try {
    url = unwrapLink(new URL(text.trim()));
  } catch {
    return null;
  }
  const params = new URLSearchParams(url.search);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'session', accessToken, refreshToken };

  const tokenHash = params.get('token_hash') ?? params.get('token');
  if (!tokenHash) return null;
  const type = (params.get('type') ?? 'magiclink') as EmailOtpType;
  return { kind: 'token-hash', tokenHash, type: otpTypes.includes(type) ? type : 'magiclink' };
}

export async function verifySignInLink(text: string): Promise<User> {
  const link = parseSignInLink(text);
  if (!link) throw new Error('That does not look like the sign-in link from the email. Copy the whole link and try again.');
  const auth = (await supabase()).auth;
  const { data, error } =
    link.kind === 'session'
      ? await auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
      : await auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
  if (error || !data.user) {
    throw new Error(error?.message ?? 'That link did not work. It may have been used already; request a new email.');
  }
  return data.user;
}

export async function currentUser(): Promise<User | null> {
  const { data } = await (await supabase()).auth.getSession();
  return data.session?.user ?? null;
}

/** Revoke every refreshable Supabase session for this account, not only this browser. */
export async function signOutRemote(): Promise<void> {
  const { error } = await (await supabase()).auth.signOut({ scope: 'global' });
  if (error) throw new Error(error.message);
}

// ---------- Account devices ----------

export type AccountDevice = {
  id: string;
  device_key: string;
  label: string;
  platform: string;
  app_ids: string[];
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

function accountDeviceKey(): string {
  const storageKey = 'proairetos.deviceKey';
  let key = localStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(storageKey, key);
  }
  return key;
}

function accountDeviceDetails(): { key: string; label: string; platform: string; appId: string } {
  const ua = navigator.userAgent;
  const platform = /iPhone|iPad/.test(ua) ? 'ios'
    : /Android/.test(ua) ? 'android'
    : /Windows/.test(ua) ? 'windows'
    : /Mac OS/.test(ua) ? 'macos'
    : /Linux/.test(ua) ? 'linux' : 'web';
  const label = platform === 'ios' ? 'Apple device'
    : platform === 'android' ? 'Android device'
    : platform === 'windows' ? 'Windows device'
    : platform === 'macos' ? 'Mac'
    : platform === 'linux' ? 'Linux device' : 'Web browser';
  const path = location.pathname.split('/').filter(Boolean);
  const knownApps = ['askesis','soma','oikonomia','hydros','poreia','praxis','theoria','diaita','philia','ergon','therapeia','dynamis','ktema','phyton','mneme','melete'];
  const appId = knownApps.includes(path[0] ?? '') ? path[0] : 'proairetos';
  return { key: accountDeviceKey(), label, platform, appId };
}

/** Register or refresh this browser installation. Device metadata only; no credentials or keys. */
export async function registerAccountDevice(): Promise<void> {
  const { key, label, platform, appId } = accountDeviceDetails();
  const client = await supabase();
  const { data: existing, error: readError } = await client
    .from('account_devices').select('app_ids, revoked_at').eq('device_key', key).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing?.revoked_at) throw new Error('This device was revoked from your Proairetos account. Sign in again to reconnect it.');
  const appIds = [...new Set([...(existing?.app_ids ?? []), appId])];
  const { error } = await client.from('account_devices').upsert({
    device_key: key, label, platform, app_ids: appIds, last_seen_at: new Date().toISOString(), revoked_at: null,
  }, { onConflict: 'user_id,device_key' });
  if (error) throw new Error(error.message);
}

export async function listAccountDevices(): Promise<AccountDevice[]> {
  const { data, error } = await (await supabase()).from('account_devices')
    .select('id, device_key, label, platform, app_ids, created_at, last_seen_at, revoked_at')
    .order('last_seen_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AccountDevice[];
}

/** Marks a device revoked. Session-token enforcement is performed by auth revocation, not this metadata flag alone. */
export async function revokeAccountDevice(id: string): Promise<void> {
  const { error } = await (await supabase()).from('account_devices')
    .update({ revoked_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- Wrapped key ----------

/** The account's wrapped data key. `passphrase` is null for an account set up with a passkey and no passphrase. */
export async function fetchWrappedKeys(): Promise<{ passphrase: WrappedKey | null; recovery: WrappedKey } | null> {
  const { data, error } = await (await supabase()).from('user_keys').select('passphrase_wrap, recovery_wrap').maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { passphrase: (data.passphrase_wrap as WrappedKey | null) ?? null, recovery: data.recovery_wrap as WrappedKey } : null;
}

/** Raised when the server still requires a passphrase (before migration 20261023000000_passkey_first.sql). */
export class PassphraseRequired extends Error {}

export async function saveWrappedKeys(userId: string, passphrase: WrappedKey | null, recovery: WrappedKey): Promise<void> {
  // The owner is named outright rather than left to the column default, so a
  // table set up without that default still accepts the row.
  // Insert, never overwrite: keys another device already saved must stay.
  const { error } = await (await supabase())
    .from('user_keys')
    .insert({ user_id: userId, passphrase_wrap: passphrase, recovery_wrap: recovery });
  if (error && !passphrase && /passphrase_wrap|not-null|null value/i.test(error.message)) throw new PassphraseRequired(error.message);
  if (error) throw new Error(signInExpired(error.message));
}

/** Replaces the passphrase wrap only (a new passphrase); the recovery wrap stays as it is. */
export async function savePassphraseWrap(userId: string, passphrase: WrappedKey): Promise<void> {
  const { data, error } = await (await supabase())
    .from('user_keys')
    .update({ passphrase_wrap: passphrase, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('user_id');
  if (error) throw new Error(signInExpired(error.message));
  if (!data?.length) throw new Error('The new passphrase was not saved. Sign in again and try once more.');
}

/** An RLS refusal here almost always means the sign-in did not reach the request. */
function signInExpired(message: string): string {
  return /row-level security/i.test(message)
    ? 'The server did not recognize this sign-in. Sign out, sign in again with a new email link, and try once more.'
    : message;
}

// ---------- Sealed records ----------

export function createSupabaseRemoteStore(userId: string): RemoteStore {
  return {
    async pull(afterSeq, limit) {
      const { data, error } = await (await supabase())
        .from('records')
        .select('collection, id, iv, ciphertext, deleted, seq')
        .gt('seq', afterSeq)
        .order('seq', { ascending: true })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as RemoteRecord[];
    },
    async push(records: OutgoingRecord[]) {
      if (records.length === 0) return;
      const rows = records.map((record) => ({ user_id: userId, ...record }));
      const { error } = await (await supabase()).from('records').upsert(rows, { onConflict: 'user_id,collection,id' });
      if (error) throw new Error(error.message);
    },
  };
}

// ---------- Sealed files (photos and files kept with items) ----------

export function createSupabaseFileStore(): FileStore {
  const bucket = async () => (await supabase()).storage.from(filesBucket);
  return {
    async upload(path, bytes) {
      const { error } = await (await bucket()).upload(path, bytes, { upsert: true, contentType: 'application/octet-stream' });
      if (error) throw new Error(error.message);
    },
    async download(path) {
      const { data, error } = await (await bucket()).download(path);
      if (error || !data) return null;
      return data.arrayBuffer();
    },
    async remove(paths) {
      const { error } = await (await bucket()).remove(paths);
      if (error) throw new Error(error.message);
    },
  };
}

// ---------- Bring your own storage ----------

/** Raised when the server has not yet had the storage-links migration: records sync through Proairetos's server. */
export class NoStorageLinks extends Error {}

export type StorageLinkRow = { provider: 'google' | 'dropbox' | 'onedrive'; sealed: { iv: string; ciphertext: string } };

/** Which storage this account syncs through; null for Proairetos's own server. */
export async function fetchStorageLink(): Promise<StorageLinkRow | null> {
  const { data, error } = await (await supabase()).from('storage_links').select('provider, sealed').maybeSingle();
  if (error) {
    if (/relation|schema cache|storage_links/.test(error.message)) throw new NoStorageLinks(error.message);
    throw new Error(error.message);
  }
  return (data as StorageLinkRow | null) ?? null;
}

export async function saveStorageLink(userId: string, link: StorageLinkRow): Promise<void> {
  const { error } = await (await supabase())
    .from('storage_links')
    .upsert({ user_id: userId, ...link, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(/relation|schema cache/.test(error.message) ? 'Your own storage is not set up on the server yet.' : error.message);
}

export async function deleteStorageLink(userId: string): Promise<void> {
  const { error } = await (await supabase()).from('storage_links').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/** After moving to the person's own storage: the sealed copy on Proairetos's server goes. */
export async function removeServerCopy(userId: string): Promise<void> {
  const client = await supabase();
  const { error } = await client.from('records').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
  const folder = `${userId}/attachments`;
  for (;;) {
    const { data } = await client.storage.from(filesBucket).list(folder, { limit: 100 });
    if (!data?.length) return;
    const { error: removeError } = await client.storage.from(filesBucket).remove(data.map((file) => `${folder}/${file.name}`));
    if (removeError) return;
  }
}

// ---------- Push subscriptions and reminder times ----------

export async function savePushSubscription(subscription: PushSubscriptionJSON, userId: string): Promise<void> {
  const { error } = await (await supabase())
    .from('push_subscriptions')
    .upsert(
      { endpoint: subscription.endpoint, p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth, user_id: userId },
      { onConflict: 'endpoint' },
    );
  if (error) throw new Error(error.message);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await (await supabase()).from('push_subscriptions').delete().eq('endpoint', endpoint);
}

/** Replaces upcoming reminder times. Only times and opaque ids are sent. */
export async function replaceReminders(userId: string, reminders: { id: string; fire_at: string }[]): Promise<void> {
  const client = await supabase();
  // Replace every pending row still to come (an old lead time may have left one at the wrong moment). A row whose
  // time has come stays: the server sends due rows once a minute, and the new list starts from now, so clearing it
  // here, in the minute before the server's next run, would lose that reminder.
  const { error: clearError } = await client
    .from('reminders')
    .delete()
    .eq('user_id', userId)
    .is('sent_at', null)
    .gt('fire_at', new Date().toISOString());
  if (clearError) throw new Error(clearError.message);
  if (reminders.length === 0) return;
  const { error } = await client
    .from('reminders')
    .upsert(reminders.map((r) => ({ ...r, user_id: userId })), { onConflict: 'user_id,id', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

/** Raised when the server has not yet had the reminder-sources migration; the caller falls back to the old way. */
export class OlderRemindersTable extends Error {}

/**
 * Replaces one app's upcoming reminders, leaving the other apps' alone. Each row carries its words sealed
 * with the account key (the server cannot read them) for the push to bring along.
 */
export async function replaceSourceReminders(
  userId: string,
  source: string,
  reminders: { id: string; fire_at: string; sealed: string; preview_title?: string | null; preview_body?: string | null; preview_open?: string | null }[],
): Promise<void> {
  const client = await supabase();
  const older = (error: { code?: string; message: string }) =>
    error.code === '42703' || error.code === 'PGRST204' || /source|sealed/.test(error.message);
  // Only rows still to come: one whose time has come waits for the server's next run (see replaceReminders).
  const { error: clearError } = await client
    .from('reminders')
    .delete()
    .eq('user_id', userId)
    .eq('source', source)
    .is('sent_at', null)
    .gt('fire_at', new Date().toISOString());
  if (clearError) throw older(clearError) ? new OlderRemindersTable(clearError.message) : new Error(clearError.message);
  if (reminders.length === 0) return;
  const write = (rows: typeof reminders) =>
    client.from('reminders').upsert(rows.map((r) => ({ ...r, source, user_id: userId })), { onConflict: 'user_id,id', ignoreDuplicates: true });
  let { error } = await write(reminders);
  // A server with sources but not yet the preview columns still takes the sealed words, so the phone shows each
  // app's own name, icon and words; only the lock-screen preview waits for that migration.
  if (error && /preview_/.test(error.message)) ({ error } = await write(reminders.map(({ id, fire_at, sealed }) => ({ id, fire_at, sealed }))));
  if (error) throw older(error) ? new OlderRemindersTable(error.message) : new Error(error.message);
}

/**
 * One reminder for checking that pushes reach this account: kept under its own source, so no app's refresh clears
 * it before the server's next run sends it.
 */
export async function addTestReminder(userId: string, reminder: { id: string; fire_at: string; sealed: string }): Promise<void> {
  const { error } = await (await supabase()).from('reminders').insert({ ...reminder, source: 'test', user_id: userId });
  if (error) throw new Error(error.message);
}

/** Whether any phone or computer on this account takes reminders, so apps without their own know to write theirs. */
export async function hasPushSubscription(): Promise<boolean> {
  const { data, error } = await (await supabase()).from('push_subscriptions').select('endpoint').limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

// ---------- Calendar feed (optional, readable by choice) ----------

/** Rows written by this version carry 2. The server serves and accepts only these (migration 20261111000000), so a file made by an older version is neither served nor written back. */
const FEED_FORMAT = 2;

/** The link calendar apps subscribe to. */
export function calendarFeedUrl(token: string): string {
  return `${syncConfig.url}/functions/v1/calendar-feed?token=${token}`;
}

/** The token already in use, so another device keeps the same link. */
export async function fetchCalendarFeedToken(): Promise<string | null> {
  const { data, error } = await (await supabase()).from('calendar_feeds').select('token').eq('format', FEED_FORMAT).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.token as string | undefined) ?? null;
}

export async function publishCalendarFeed(userId: string, token: string, ics: string): Promise<void> {
  const { error } = await (await supabase())
    .from('calendar_feeds')
    .upsert({ user_id: userId, token, ics, format: FEED_FORMAT, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

export async function deleteCalendarFeed(userId: string): Promise<void> {
  const { error } = await (await supabase()).from('calendar_feeds').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/**
 * Refreshes an existing feed's file only. If the feed was turned off or
 * given a new link elsewhere, nothing matches and nothing is recreated.
 * Returns whether a feed was updated.
 */
export async function updateCalendarFeed(userId: string, token: string, ics: string): Promise<boolean> {
  const { data, error } = await (await supabase())
    .from('calendar_feeds')
    .update({ ics, format: FEED_FORMAT, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('token', token)
    .eq('format', FEED_FORMAT)
    .select('token');
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

// ---------- Deleting the account ----------

/** Deletes the account on the server and everything stored with it. The device keeps its own copy. */
export async function deleteRemoteAccount(): Promise<void> {
  const client = await supabase();
  const { error } = await client.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw new Error('The account could not be deleted. Check your connection and try again.');
}

export async function signInWithHandoffToken(tokenHash: string): Promise<User> {
  const { data, error } = await (await supabase()).auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (error || !data.user) throw new Error('That pass has been used or is too old. Make a new one in Proairetos.');
  return data.user;
}

// ---------- Passkeys ----------

export type PasskeyRow = {
  credential_id: string;
  public_key: string;
  algorithm: number;
  rp_id: string;
  wrap: WrappedKey | null;
  label: string | null;
  created_at?: string;
  last_used_at?: string | null;
};

const passkeysMissing = (message: string) =>
  /relation|schema cache|passkeys/.test(message) ? 'Passkeys are not set up on the server yet.' : signInExpired(message);

/** This person's passkeys (signed in). */
export async function fetchPasskeys(): Promise<PasskeyRow[]> {
  const { data, error } = await (await supabase())
    .from('passkeys')
    .select('credential_id, public_key, algorithm, rp_id, wrap, label, created_at, last_used_at')
    .order('created_at');
  if (error) throw new Error(passkeysMissing(error.message));
  return (data ?? []) as PasskeyRow[];
}

export async function savePasskey(userId: string, row: PasskeyRow): Promise<void> {
  const { error } = await (await supabase()).from('passkeys').insert({ ...row, user_id: userId });
  if (error) throw new Error(passkeysMissing(error.message));
}

/** Keeps the data key sealed for a passkey that until now only signed in. */
export async function savePasskeyWrap(credentialId: string, wrap: WrappedKey): Promise<void> {
  const { error } = await (await supabase()).from('passkeys').update({ wrap }).eq('credential_id', credentialId);
  if (error) throw new Error(passkeysMissing(error.message));
}

export async function deletePasskey(credentialId: string): Promise<void> {
  const { error } = await (await supabase()).from('passkeys').delete().eq('credential_id', credentialId);
  if (error) throw new Error(passkeysMissing(error.message));
}

async function passkeyFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await (await supabase()).functions.invoke('passkey-sign-in', { method: 'POST', body });
  if (error || !data) {
    const status = (error as { context?: Response } | null)?.context?.status;
    throw new Error(status === 401 ? 'That passkey did not sign in. Try again, or sign in by email.' : 'Passkeys are not set up on the server yet.');
  }
  return data as T;
}

export function beginPasskeySignIn(): Promise<{ challenge: string }> {
  return passkeyFunction({ step: 'begin' });
}

export function finishPasskeySignIn(answer: {
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}): Promise<{ token_hash: string; wrap: WrappedKey | null }> {
  return passkeyFunction({ step: 'finish', ...answer });
}

// ---------- Capture from anywhere (migration 20261024000000_capture_inbox.sql) ----------

/** Sets up (or replaces) this account's capture inbox: the token's hash and the public key that seals what arrives. */
export async function saveCaptureInbox(userId: string, tokenHash: string, publicKey: JsonWebKey): Promise<void> {
  const { error } = await (await supabase())
    .from('capture_inboxes')
    .upsert({ user_id: userId, token_hash: tokenHash, public_key: publicKey }, { onConflict: 'user_id' });
  if (error) throw new Error(/capture_inboxes/.test(error.message) ? 'The server is not ready for this yet.' : error.message);
}

export async function deleteCaptureInbox(userId: string): Promise<void> {
  const { error } = await (await supabase()).from('capture_inboxes').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function fetchInboxItems(): Promise<{ id: string; sealed: string; created_at: string }[]> {
  const { data, error } = await (await supabase()).from('capture_inbox_items').select('id, sealed, created_at').order('created_at').limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; sealed: string; created_at: string }[];
}

export async function deleteInboxItems(ids: readonly string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await (await supabase()).from('capture_inbox_items').delete().in('id', ids as string[]);
  if (error) throw new Error(error.message);
}

// Apple Health (migration 20261028000000): the same shape, plus the token and private key sealed with the account's key.
export async function saveHealthInbox(userId: string, tokenHash: string, publicKey: JsonWebKey, sealedKey: string): Promise<void> {
  const { error } = await (await supabase())
    .from('health_inboxes')
    .upsert({ user_id: userId, token_hash: tokenHash, public_key: publicKey, sealed_key: sealedKey }, { onConflict: 'user_id' });
  if (error) throw new Error(/health_inboxes/.test(error.message) ? 'The server is not ready for this yet.' : error.message);
}

/** The account's Apple Health address (sealed), or null when there is none. Throws when the server cannot say. */
export async function fetchHealthInbox(): Promise<{ sealed_key: string } | null> {
  const { data, error } = await (await supabase()).from('health_inboxes').select('sealed_key').maybeSingle();
  if (error) throw new Error(/health_inboxes/.test(error.message) ? 'The server is not ready for this yet.' : error.message);
  return (data as { sealed_key: string } | null) ?? null;
}

export async function deleteHealthInbox(userId: string): Promise<void> {
  const { error } = await (await supabase()).from('health_inboxes').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function fetchHealthItems(): Promise<{ id: string; sealed: string; created_at: string }[]> {
  const { data, error } = await (await supabase()).from('health_inbox_items').select('id, sealed, created_at').order('created_at').limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; sealed: string; created_at: string }[];
}

export async function deleteHealthItems(ids: readonly string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await (await supabase()).from('health_inbox_items').delete().in('id', ids as string[]);
  if (error) throw new Error(error.message);
}

// Poreia's forwarding address: the same shape as the capture inbox, in its own tables (migration 20261027000000).
export async function saveTripInbox(userId: string, tokenHash: string, publicKey: JsonWebKey): Promise<void> {
  const { error } = await (await supabase())
    .from('trip_inboxes')
    .upsert({ user_id: userId, token_hash: tokenHash, public_key: publicKey }, { onConflict: 'user_id' });
  if (error) throw new Error(/trip_inboxes/.test(error.message) ? 'The server is not ready for this yet.' : error.message);
}

export async function deleteTripInbox(userId: string): Promise<void> {
  const { error } = await (await supabase()).from('trip_inboxes').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function fetchTripInboxItems(): Promise<{ id: string; sealed: string; created_at: string }[]> {
  const { data, error } = await (await supabase()).from('trip_inbox_items').select('id, sealed, created_at').order('created_at').limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; sealed: string; created_at: string }[];
}

export async function deleteTripInboxItems(ids: readonly string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await (await supabase()).from('trip_inbox_items').delete().in('id', ids as string[]);
  if (error) throw new Error(error.message);
}
