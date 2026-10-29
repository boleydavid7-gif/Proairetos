/*
 * One household for the people at home. It is itself a sealed shared list (label `proairetos-household`) whose items
 * say which apps share with it: each part carries that app's own shared list (its id, key and name), so joining the
 * household joins them all, and an app added later reaches everyone on their next look. Members write a line with
 * their name so everyone sees who is in. Nothing here reads or changes an app's records; each app keeps sharing
 * through its own list exactly as before.
 */
export type HouseholdApp = 'proairetos' | 'soma' | 'ergon' | 'phyton' | 'therapeia';

export type ListRef = { id: string; key: string; name: string };

export type HouseholdItem =
  | { id: string; kind: 'part'; app: HouseholdApp; list: ListRef; at: string }
  | { id: string; kind: 'member'; name: string; email?: string; at: string };

export type Part = Extract<HouseholdItem, { kind: 'part' }>;
export type Member = Extract<HouseholdItem, { kind: 'member' }>;

/** What each app shares, in the order the page lists them. `single`: the app keeps to one shared list. */
export const HOUSEHOLD_APPS: readonly { app: HouseholdApp; name: string; single: boolean }[] = [
  { app: 'proairetos', name: 'To-dos', single: true },
  { app: 'soma', name: 'Groceries', single: false },
  { app: 'ergon', name: 'Chores', single: true },
  { app: 'phyton', name: 'Plants', single: true },
  { app: 'therapeia', name: 'Medicines', single: true },
];

export const partId = (app: HouseholdApp) => `part:${app}`;
export const memberId = (userId: string) => `member:${userId}`;

export const partsOf = (items: readonly HouseholdItem[]): Part[] => items.filter((item): item is Part => item.kind === 'part');
export const membersOf = (items: readonly HouseholdItem[]): Member[] =>
  items.filter((item): item is Member => item.kind === 'member').sort((a, b) => a.at.localeCompare(b.at));

export type PartState = 'shared' | 'join' | 'elsewhere';

/**
 * Where this person stands with one part: already in its list, about to join it, or (for an app that keeps to one
 * list) sharing through another list already, which is left alone.
 */
export function partState(part: Part, theirs: readonly { id: string }[], single: boolean): PartState {
  if (theirs.some((list) => list.id === part.list.id)) return 'shared';
  if (single && theirs.length > 0) return 'elsewhere';
  return 'join';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function householdLink(origin: string, list: ListRef): string {
  return `${origin}/?open=household:${list.id}#k=${list.key}&n=${encodeURIComponent(list.name)}`;
}

export function readHouseholdInvite(search: string, hash: string): ListRef | undefined {
  const open = new URLSearchParams(search).get('open') ?? '';
  if (!open.startsWith('household:')) return undefined;
  const id = open.slice('household:'.length);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const key = fragment.get('k') ?? '';
  if (!UUID.test(id) || !/^[A-Za-z0-9_-]{40,50}$/.test(key)) return undefined;
  return { id, key, name: (fragment.get('n') ?? '').slice(0, 60) || 'Home' };
}

/** "Sam", "Sam and Alex", "Sam, Alex and Jo". */
export function namesText(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
