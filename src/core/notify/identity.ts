import type { Notice } from './notices';

/*
 * A notice's identity is its key, and, while a key is being changed, the earlier keys it had (`also`). Anything that remembers a
 * notice (shown on the lock screen, seen or cleared on the notifications page) remembers it under the key it had then, so it asks
 * for the key or any of the earlier ones. `public/sw.js` cannot import this and keeps the same rule; a test holds the two together.
 */
export const identitiesOf = (notice: Pick<Notice, 'key' | 'also'>): string[] => [notice.key, ...(notice.also ?? [])];

/** Whether a set of remembered keys holds this notice under any of its keys. */
export const remembers = (keys: ReadonlySet<string>, notice: Pick<Notice, 'key' | 'also'>): boolean => identitiesOf(notice).some((key) => keys.has(key));

/** Remembers the notice under its current key as well, once it is known under an earlier one, so the earlier one can go in time. */
export function carryOver(keys: Set<string>, notice: Pick<Notice, 'key' | 'also'>): boolean {
  if (keys.has(notice.key) || !remembers(keys, notice)) return false;
  keys.add(notice.key);
  return true;
}

/** Record ids in one fixed order, the same on every device (plain code-unit order, never a locale's). */
export const sortedIds = (ids: readonly string[]): string[] => [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/** A key made of record ids, cut to the length the sealed words keep. Ids are random and synced, so every device makes the same one. */
export const idKey = (prefix: string, ids: readonly string[], limit = 80): string => `${prefix}${sortedIds(ids).join('|').slice(0, limit)}`;

/** A notice with the key it used to have as its alias (none when the two are the same). */
export const withEarlierKey = (notice: Notice, earlier: string): Notice => (earlier && earlier !== notice.key ? { ...notice, also: [earlier] } : notice);
