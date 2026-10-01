import type { SupabaseClient, User } from '@supabase/supabase-js';
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

let client: Promise<SupabaseClient> | null = null;

/** Loaded only when sync is configured, so the app stays small without it. */
export function supabase(): Promise<SupabaseClient> {
  if (!isSyncConfigured) return Promise.reject(new Error('Sync is not set up for this app.'));
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(syncConfig.url!, syncConfig.anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'proairetos.auth' },
    }),
  );
  return client;
}

// ---------- Sign-in by emailed code ----------
// A code, not a link: on iPhone a link opens Safari, which does not share
// storage with the app added to the Home Screen.

export async function sendSignInCode(email: string): Promise<void> {
  const { error } = await (await supabase()).auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}

export async function verifySignInCode(email: string, code: string): Promise<User> {
  const { data, error } = await (await supabase()).auth.verifyOtp({ email, token: code.trim(), type: 'email' });
  if (error || !data.user) throw new Error(error?.message ?? 'That code did not work. Request a new one.');
  return data.user;
}

export async function currentUser(): Promise<User | null> {
  const { data } = await (await supabase()).auth.getSession();
  return data.session?.user ?? null;
}

export async function signOutRemote(): Promise<void> {
  await (await supabase()).auth.signOut();
}

// ---------- Wrapped key ----------

export async function fetchWrappedKeys(): Promise<{ passphrase: WrappedKey; recovery: WrappedKey } | null> {
  const { data, error } = await (await supabase()).from('user_keys').select('passphrase_wrap, recovery_wrap').maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { passphrase: data.passphrase_wrap as WrappedKey, recovery: data.recovery_wrap as WrappedKey } : null;
}

export async function saveWrappedKeys(passphrase: WrappedKey, recovery: WrappedKey): Promise<void> {
  const { error } = await (await supabase()).from('user_keys').insert({ passphrase_wrap: passphrase, recovery_wrap: recovery });
  if (error) throw new Error(error.message);
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
  const { error: clearError } = await client.from('reminders').delete().is('sent_at', null).gte('fire_at', new Date().toISOString());
  if (clearError) throw new Error(clearError.message);
  if (reminders.length === 0) return;
  const { error } = await client
    .from('reminders')
    .upsert(reminders.map((r) => ({ ...r, user_id: userId })), { onConflict: 'user_id,id', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}
