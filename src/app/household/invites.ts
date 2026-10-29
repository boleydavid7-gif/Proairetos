import { useSyncExternalStore } from 'react';
import { supabase } from '../../data/sync/supabase';
import { displayName } from '../../data/storage/preferences';
import { openSealed } from '../capture/inbox';
import { openWithAccount, sealWithAccount, syncStatus } from '../sync/syncController';
import type { ListRef } from '../../core/household/household';

/*
 * Household invites by email (migration 20261031000000_household_invites.sql). Each account has a key pair made on its
 * device: the public half on the server, the private half there too but sealed with the account's data key, so any of
 * the person's devices can open what was sealed for them and the server cannot. An invite seals the household's list
 * id and key to the invitee's public key; it shows on their devices once signed in with that email.
 */
const PURPOSE = 'proairetos-household-invite';
const CACHE = 'proairetosHouseholdInvites';

export type Incoming = { id: string; from: string; household: ListRef; at: string };
export type Outgoing = { id: string; email: string; at: string };

const b64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/** Seals a value so only the holder of the private key can open it (the same shape `openSealed` opens). */
export async function sealFor(publicJwk: JsonWebKey, value: unknown, purpose = PURPOSE): Promise<string> {
  const publicKey = await crypto.subtle.importKey('jwk', publicJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(purpose) }, aes, new TextEncoder().encode(JSON.stringify(value)));
  const k = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, await crypto.subtle.exportKey('raw', aes));
  return btoa(JSON.stringify({ v: 1, k: b64(k), iv: b64(iv), c: b64(c) }));
}

async function me(): Promise<{ id: string; email: string } | undefined> {
  const { data } = await (await supabase()).auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? '' } : undefined;
}

const plain = (error: { message: string } | null) => {
  if (!error) return;
  if (/relation .* does not exist|schema cache|account_keys|household_invites|invitee_key/.test(error.message)) throw new Error('Invites by email are not set up on the server yet.');
  throw new Error(error.message);
};

let privateKey: Promise<JsonWebKey | undefined> | undefined;

/**
 * This account's private key, made once its data is open on a device (undefined until then). Kept in memory for the
 * visit; any device opens the same one from the server.
 */
export function accountKey(): Promise<JsonWebKey | undefined> {
  if (privateKey) return privateKey;
  privateKey = (async () => {
    if (syncStatus.get().phase !== 'ready') return undefined;
    const user = await me();
    if (!user) return undefined;
    const client = await supabase();
    const { data, error } = await client.from('account_keys').select('sealed_private').eq('user_id', user.id).maybeSingle();
    plain(error);
    if (data) {
      const opened = await openWithAccount('account-key', unb64((data as { sealed_private: string }).sealed_private).buffer as ArrayBuffer);
      return opened ? (JSON.parse(new TextDecoder().decode(opened)) as JsonWebKey) : undefined;
    }
    const pair = (await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt'])) as CryptoKeyPair;
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const sealed = await sealWithAccount('account-key', new TextEncoder().encode(JSON.stringify(privateJwk)).buffer as ArrayBuffer);
    if (!sealed) return undefined;
    plain((await client.from('account_keys').upsert({ user_id: user.id, public_key: await crypto.subtle.exportKey('jwk', pair.publicKey), sealed_private: b64(sealed.sealed) })).error);
    return privateJwk;
  })().catch((cause) => {
    privateKey = undefined;
    throw cause;
  });
  return privateKey;
}

/** Invites the account with this email to the household. */
export async function inviteByEmail(email: string, household: ListRef): Promise<void> {
  const address = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) throw new Error('That doesn’t look like an email address.');
  const user = await me();
  if (!user) throw new Error('Sign in first.');
  if (address === user.email.toLowerCase()) throw new Error('That’s your own email.');
  const client = await supabase();
  const { data, error } = await client.rpc('invitee_key', { address });
  plain(error);
  const found = data as { user_id: string; public_key: JsonWebKey } | null;
  if (!found) throw new Error('No account with that email has opened Proairetos on this version yet. Send the link instead.');
  const from = displayName().trim() || user.email;
  const sealed = await sealFor(found.public_key, { household, from });
  plain((await client.from('household_invites').insert({ to_user: found.user_id, to_email: address, from_user: user.id, sealed })).error);
  await refreshInvites();
}

// ---------- What is waiting ----------

const listeners = new Set<() => void>();
let state: { incoming: Incoming[]; outgoing: Outgoing[] } = { incoming: readCache(), outgoing: [] };

function readCache(): Incoming[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE) ?? '[]') as Incoming[];
  } catch {
    return [];
  }
}

function set(next: typeof state): void {
  state = next;
  try {
    localStorage.setItem(CACHE, JSON.stringify(next.incoming));
  } catch {
    // Read again next time.
  }
  for (const listener of listeners) listener();
  // Today's card and the bell show an invite that came in.
  void import('../notify/inbox').then((inbox) => inbox.refreshInbox()).catch(() => undefined);
}

/** Reads the invites sent to this account (opened here) and those it sent that are still waiting. */
export async function refreshInvites(): Promise<void> {
  const user = await me();
  if (!user) return set({ incoming: [], outgoing: [] });
  const key = await accountKey().catch(() => undefined);
  const client = await supabase();
  const { data, error } = await client.from('household_invites').select('id, to_user, to_email, from_user, sealed, created_at');
  plain(error);
  const rows = (data ?? []) as { id: string; to_user: string; to_email: string; from_user: string; sealed: string; created_at: string }[];
  const incoming: Incoming[] = [];
  for (const row of rows.filter((each) => each.to_user === user.id)) {
    if (!key) continue;
    try {
      const opened = await openSealed<{ household: ListRef; from: string }>(key, row.sealed, PURPOSE);
      incoming.push({ id: row.id, from: opened.from, household: opened.household, at: row.created_at });
    } catch {
      // Sealed for a key this account no longer has: it cannot be opened, so it is cleared.
      await client.from('household_invites').delete().eq('id', row.id);
    }
  }
  const outgoing = rows.filter((each) => each.from_user === user.id).map((row) => ({ id: row.id, email: row.to_email, at: row.created_at }));
  set({ incoming, outgoing });
}

/** Removes an invite: one answered, set aside, or taken back by its sender. */
export async function removeInvite(id: string): Promise<void> {
  plain((await (await supabase()).from('household_invites').delete().eq('id', id)).error);
  set({ incoming: state.incoming.filter((each) => each.id !== id), outgoing: state.outgoing.filter((each) => each.id !== id) });
}

/** Invites seen here last, for the bell and Today's card without asking the server. */
export const cachedInvites = (): Incoming[] => state.incoming;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useInvites(): typeof state {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
