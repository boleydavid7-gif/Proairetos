import { isSyncConfigured, supabase } from '../../data/sync/supabase';
import { queue, withPending, type Pending, type SharedItem, type SharedList } from '../core/sharedList';

/*
 * Shared grocery lists on the server (migration 20261018000000_shared_lists.sql). The lists this person has
 * are a setting (`soma:sharedLists`), so their own other devices get them through sync, sealed with the
 * account key. Each list's items are cached on this phone with any changes not yet sent, so the list works
 * offline and catches up when it can.
 */
const LISTS = 'soma:sharedLists';
const cacheKey = (id: string) => `somaShared.items.${id}`;
const pendingKey = (id: string) => `somaShared.pending.${id}`;

export const sharingAvailable = isSyncConfigured;

const listeners = new Set<() => void>();
let version = 0;
function changed(): void {
  version += 1;
  for (const listener of listeners) listener();
}
export function subscribeShared(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const sharedVersion = () => version;
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => event.key?.startsWith('soma') && changed());

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the list still shows from memory this time.
  }
}

export const sharedLists = (): SharedList[] => read<SharedList[]>(LISTS, []);
const saveLists = (lists: SharedList[]) => {
  write(LISTS, lists);
  changed();
};

// ---------- Keys ----------

const toB64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)), (c) => c.charCodeAt(0));

const keys = new Map<string, Promise<CryptoKey>>();
function keyOf(list: SharedList): Promise<CryptoKey> {
  let key = keys.get(list.id);
  if (!key) {
    key = crypto.subtle.importKey('raw', fromB64url(list.key), 'AES-GCM', false, ['encrypt', 'decrypt']);
    keys.set(list.id, key);
  }
  return key;
}

/** What the server checks on joining: a hash of the key, so the key itself never reaches it. */
export async function joinProof(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`proairetos-list-join:${key}`));
  return toB64url(new Uint8Array(digest));
}

export async function sealItem(list: SharedList, item: SharedItem): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`soma-list:${list.id}:${item.id}`) },
      await keyOf(list),
      new TextEncoder().encode(JSON.stringify(item)),
    ),
  );
  const all = new Uint8Array(iv.length + sealed.length);
  all.set(iv);
  all.set(sealed, iv.length);
  return toB64url(all);
}

export async function openItem(list: SharedList, id: string, sealed: string): Promise<SharedItem | undefined> {
  try {
    const bytes = fromB64url(sealed);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode(`soma-list:${list.id}:${id}`) },
      await keyOf(list),
      bytes.slice(12),
    );
    return JSON.parse(new TextDecoder().decode(plain)) as SharedItem;
  } catch {
    return undefined;
  }
}

// ---------- Account ----------

async function me(): Promise<string> {
  const { data } = await (await supabase()).auth.getUser();
  if (!data.user) throw new Error('Sign in to use shared lists.');
  return data.user.id;
}

const plain = (error: { message: string } | null) => {
  if (!error) return;
  if (/relation .* does not exist|schema cache|shared_list/.test(error.message)) throw new Error('Shared lists are not set up on the server yet.');
  throw new Error(error.message);
};

/** Makes a new list in the account and keeps it here. */
export async function createList(name: string): Promise<SharedList> {
  const userId = await me();
  const list: SharedList = { id: crypto.randomUUID(), key: toB64url(crypto.getRandomValues(new Uint8Array(32))), name: name.trim().slice(0, 60) || 'Groceries', joinedAt: new Date().toISOString() };
  const client = await supabase();
  plain((await client.from('shared_lists').insert({ id: list.id, created_by: userId, join_proof: await joinProof(list.key) })).error);
  plain((await client.from('shared_list_members').insert({ list_id: list.id, user_id: userId })).error);
  saveLists([...sharedLists(), list]);
  return list;
}

/** Joins from an invite link; the list is then kept here like one of one's own. */
export async function joinList(invite: { id: string; key: string; name: string }): Promise<SharedList> {
  await me();
  const existing = sharedLists().find((list) => list.id === invite.id);
  if (existing) return existing;
  const { data, error } = await (await supabase()).rpc('join_shared_list', { list: invite.id, proof: await joinProof(invite.key) });
  plain(error);
  if (data !== true) throw new Error('This link does not open a list. Ask for a new one.');
  const list: SharedList = { ...invite, joinedAt: new Date().toISOString() };
  saveLists([...sharedLists(), list]);
  return list;
}

/** Leaves a list: it goes from this phone; the others keep it. */
export async function leaveList(list: SharedList): Promise<void> {
  const userId = await me();
  plain((await (await supabase()).from('shared_list_members').delete().eq('list_id', list.id).eq('user_id', userId)).error);
  saveLists(sharedLists().filter((each) => each.id !== list.id));
  localStorage.removeItem(cacheKey(list.id));
  localStorage.removeItem(pendingKey(list.id));
}

// ---------- Items ----------

/** What to show now: the last copy from the server with this phone's unsent changes over it. */
export function sharedItems(list: SharedList): SharedItem[] {
  return withPending(read<SharedItem[]>(cacheKey(list.id), []), read<Pending[]>(pendingKey(list.id), []));
}

/** Adds, changes (an item) or removes (null) one line; sent now if possible, kept until it is. */
export function changeItem(list: SharedList, id: string, item: SharedItem | null): void {
  write(pendingKey(list.id), queue(read<Pending[]>(pendingKey(list.id), []), { id, item }));
  changed();
  void refreshList(list).catch(() => undefined);
}

const refreshing = new Map<string, Promise<void>>();

/** Sends what is waiting, then brings the whole list back from the server. */
export function refreshList(list: SharedList): Promise<void> {
  const running = refreshing.get(list.id);
  if (running) return running;
  const work = (async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const client = await supabase();
    const pending = read<Pending[]>(pendingKey(list.id), []);
    for (const change of pending) {
      const row = change.item
        ? { list_id: list.id, id: change.id, sealed: await sealItem(list, change.item), deleted: false, updated_at: new Date().toISOString() }
        : { list_id: list.id, id: change.id, sealed: '', deleted: true, updated_at: new Date().toISOString() };
      plain((await client.from('shared_list_items').upsert(row, { onConflict: 'list_id,id' })).error);
      // Taken off the queue only once sent; a change made meanwhile stays.
      write(pendingKey(list.id), read<Pending[]>(pendingKey(list.id), []).filter((each) => JSON.stringify(each) !== JSON.stringify(change)));
    }
    const { data, error } = await client.from('shared_list_items').select('id, sealed, deleted').eq('list_id', list.id);
    plain(error);
    const items: SharedItem[] = [];
    for (const row of (data ?? []) as { id: string; sealed: string; deleted: boolean }[]) {
      if (row.deleted) continue;
      const item = await openItem(list, row.id, row.sealed);
      if (item) items.push(item);
    }
    write(cacheKey(list.id), items);
    changed();
  })().finally(() => refreshing.delete(list.id));
  refreshing.set(list.id, work);
  return work;
}
