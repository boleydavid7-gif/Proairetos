import type { GroceryItem } from './groceries';

/**
 * A grocery list shared with someone. Each item is sealed with the list's own key before it leaves the phone;
 * the key travels only in the invite link after `#` (never sent to a server), so whoever has the link can read
 * and change the list, and the server cannot.
 */
export type SharedList = { id: string; key: string; name: string; joinedAt: string };

/** What a shared item carries (sealed): the parts of a grocery line two people both need. */
export type SharedItem = Pick<GroceryItem, 'id' | 'name' | 'amounts' | 'aisle' | 'checked' | 'addedAt'>;

/** A change made here that the server has not taken yet: the item, or null when it was removed. */
export type Pending = { id: string; item: SharedItem | null };

export function inviteLink(origin: string, list: Pick<SharedList, 'id' | 'key' | 'name'>): string {
  return `${origin}/soma/?open=list:${list.id}#k=${list.key}&n=${encodeURIComponent(list.name)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads an invite from an address's query and hash; undefined when it is not one, or is incomplete. */
export function readInvite(search: string, hash: string): { id: string; key: string; name: string } | undefined {
  const open = new URLSearchParams(search).get('open') ?? '';
  if (!open.startsWith('list:')) return undefined;
  const id = open.slice(5);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const key = fragment.get('k') ?? '';
  if (!UUID.test(id) || !/^[A-Za-z0-9_-]{40,50}$/.test(key)) return undefined;
  return { id, key, name: (fragment.get('n') ?? '').slice(0, 60) || 'Shared list' };
}

/** The list as the server has it, with this phone's unsent changes laid over it. */
export function withPending(fromServer: readonly SharedItem[], pending: readonly Pending[]): SharedItem[] {
  const byId = new Map(fromServer.map((item) => [item.id, item]));
  for (const change of pending) {
    if (change.item) byId.set(change.id, change.item);
    else byId.delete(change.id);
  }
  return [...byId.values()].sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

/** Keeps only the latest change for each item, so a line added and then removed offline sends once. */
export function queue(pending: readonly Pending[], change: Pending): Pending[] {
  return [...pending.filter((each) => each.id !== change.id), change];
}

/** A grocery line as a shared item (recipe links stay on this phone). */
export function toShared(item: GroceryItem): SharedItem {
  return { id: item.id, name: item.name, amounts: item.amounts, aisle: item.aisle, checked: item.checked, addedAt: item.addedAt };
}

/** A shared item shown with the list's grocery tools (by aisle, amounts). */
export function asGrocery(item: SharedItem): GroceryItem {
  return { ...item, from: [] };
}
