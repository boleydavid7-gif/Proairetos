import { isSyncConfigured, supabase } from '../../data/sync/supabase';

/*
 * Lists shared with other people, sealed on the phone with each list's own key (migration
 * 20261018000000_shared_lists.sql). The key travels only in the invite link, after `#`. The lists this person
 * has are a setting (synced and backed up like any setting); each list's items are cached on this phone with
 * any changes not yet sent, so a list works offline and catches up when it can. SOMA's grocery lists and
 * Ergon's households both use this, each with its own storage keys and sealing label.
 */
export type SharedListRef = { id: string; key: string; name: string; joinedAt: string };
export type PendingChange<T> = { id: string; item: T | null };
export type ListOptions<T> = {
  /** The setting holding the lists this person has, e.g. `soma:sharedLists`. */
  listsKey: string;
  /** Prefix of the device-only cache keys, e.g. `somaShared`. */
  cachePrefix: string;
  /** The sealing label, binding each item to its app, list and id, e.g. `soma-list`. */
  label: string;
  /** Order to show items in. */
  order?: (a: T, b: T) => number;
  /** A name for a list made without one. */
  defaultName: string;
};

export const sharingAvailable = isSyncConfigured;

/** The server's copy with this phone's unsent changes laid over it. */
export function withPendingChanges<T extends { id: string }>(fromServer: readonly T[], pending: readonly PendingChange<T>[], order?: (a: T, b: T) => number): T[] {
  const byId = new Map(fromServer.map((item) => [item.id, item]));
  for (const change of pending) {
    if (change.item) byId.set(change.id, change.item);
    else byId.delete(change.id);
  }
  const items = [...byId.values()];
  return order ? items.sort(order) : items;
}

/** Keeps only the latest change for each item. */
export function queueChange<T>(pending: readonly PendingChange<T>[], change: PendingChange<T>): PendingChange<T>[] {
  return [...pending.filter((each) => each.id !== change.id), change];
}

const toB64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)), (c) => c.charCodeAt(0));

/** What the server checks on joining: a hash of the key, so the key itself never reaches it. */
export async function joinProof(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`proairetos-list-join:${key}`));
  return toB64url(new Uint8Array(digest));
}

export const newListKey = () => toB64url(crypto.getRandomValues(new Uint8Array(32)));

export function createSharedLists<T extends { id: string }>(options: ListOptions<T>) {
  type SharedList = SharedListRef;
  type SharedItem = T;
  type Pending = PendingChange<T>;
  const LISTS = options.listsKey;
  const cacheKey = (id: string) => `${options.cachePrefix}.items.${id}`;
  const pendingKey = (id: string) => `${options.cachePrefix}.pending.${id}`;
  const listeners = new Set<() => void>();
  let version = 0;
  const changed = () => {
    version += 1;
    for (const listener of listeners) listener();
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', (event) => (event.key === LISTS || event.key?.startsWith(options.cachePrefix)) && changed());

  function read<V>(key: string, fallback: V): V {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as V) : fallback;
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
  const sharedLists = (): SharedList[] => read<SharedList[]>(LISTS, []);
  const saveLists = (lists: SharedList[]) => {
    write(LISTS, lists);
    changed();
  };
  const withPending = (server: SharedItem[], pending: Pending[]) => withPendingChanges(server, pending, options.order);
  const queue = queueChange;

  // ---------- Keys ----------


  const keys = new Map<string, Promise<CryptoKey>>();
  function keyOf(list: SharedList): Promise<CryptoKey> {
    let key = keys.get(list.id);
    if (!key) {
      key = crypto.subtle.importKey('raw', fromB64url(list.key), 'AES-GCM', false, ['encrypt', 'decrypt']);
      keys.set(list.id, key);
    }
    return key;
  }

  async function sealItem(list: SharedList, item: SharedItem): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`${options.label}:${list.id}:${item.id}`) },
        await keyOf(list),
        new TextEncoder().encode(JSON.stringify(item)),
      ),
    );
    const all = new Uint8Array(iv.length + sealed.length);
    all.set(iv);
    all.set(sealed, iv.length);
    return toB64url(all);
  }

  async function openItem(list: SharedList, id: string, sealed: string): Promise<SharedItem | undefined> {
    try {
      const bytes = fromB64url(sealed);
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode(`${options.label}:${list.id}:${id}`) },
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
  async function createList(name: string): Promise<SharedList> {
    const userId = await me();
    const list: SharedList = { id: crypto.randomUUID(), key: newListKey(), name: name.trim().slice(0, 60) || options.defaultName, joinedAt: new Date().toISOString() };
    const client = await supabase();
    plain((await client.from('shared_lists').insert({ id: list.id, created_by: userId, join_proof: await joinProof(list.key) })).error);
    plain((await client.from('shared_list_members').insert({ list_id: list.id, user_id: userId })).error);
    saveLists([...sharedLists(), list]);
    return list;
  }

  /** Joins from an invite link; the list is then kept here like one of one's own. */
  async function joinList(invite: { id: string; key: string; name: string }): Promise<SharedList> {
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
  async function leaveList(list: SharedList): Promise<void> {
    const userId = await me();
    plain((await (await supabase()).from('shared_list_members').delete().eq('list_id', list.id).eq('user_id', userId)).error);
    saveLists(sharedLists().filter((each) => each.id !== list.id));
    localStorage.removeItem(cacheKey(list.id));
    localStorage.removeItem(pendingKey(list.id));
  }

  // ---------- Items ----------

  /** What to show now: the last copy from the server with this phone's unsent changes over it. */
  function sharedItems(list: SharedList): SharedItem[] {
    return withPending(read<SharedItem[]>(cacheKey(list.id), []), read<Pending[]>(pendingKey(list.id), []));
  }

  /** Adds, changes (an item) or removes (null) one line; sent now if possible, kept until it is. */
  function changeItem(list: SharedList, id: string, item: SharedItem | null): void {
    write(pendingKey(list.id), queue(read<Pending[]>(pendingKey(list.id), []), { id, item }));
    changed();
    void refreshList(list).catch(() => undefined);
  }

  const refreshing = new Map<string, Promise<void>>();

  /** Sends what is waiting, then brings the whole list back from the server. */
  function refreshList(list: SharedList): Promise<void> {
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

  return {
    sharedLists,
    subscribeShared: subscribe,
    sharedVersion: () => version,
    sealItem,
    openItem,
    createList,
    joinList,
    leaveList,
    sharedItems,
    changeItem,
    refreshList,
  };
}
