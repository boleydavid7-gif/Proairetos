/*
 * Which provider results a sync made out of date. A provider names what it reads (`sources`):
 *   a synced collection ("oikonomiaBills"),
 *   "local:<prefix>"  records kept one per browser-storage key (they sync as `preferences` records, id = the key),
 *   "setting:<key>"   one stored setting (also a `preferences` record),
 *   "shared:<name>"   a list shared with a household, kept by its own sharing code (only its own watcher drops these).
 * A sync reports the collections it changed and, for each, the record ids, so a change to one app's settings does not
 * drop another app's cached result.
 */
export function sourceChanged(sources: readonly string[], collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>): boolean {
  if (collections.includes('*')) return true;
  const settingIds = ids?.get('preferences');
  const touchedSettings = collections.includes('preferences');
  return sources.some((source) => {
    if (source.startsWith('shared:')) return false;
    if (source.startsWith('local:')) {
      const prefix = source.slice(6);
      return touchedSettings && (!settingIds || settingIds.some((id) => id.startsWith(prefix)));
    }
    if (source.startsWith('setting:')) {
      const key = source.slice(8);
      return touchedSettings && (!settingIds || settingIds.includes(key));
    }
    return collections.includes(source);
  });
}
