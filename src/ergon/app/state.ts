import { useEffect, useSyncExternalStore } from 'react';
import { collection, stored } from '../../app/family/shell';
import { createSharedLists, joinProof, sharingAvailable, type SharedListRef } from '../../app/family/sharedLists';
import { notifications } from '../../app/notify/notifications';
import { defaultChoreNotices, type ChoreNoticeChoices } from '../core/notices';
import { namesIn, type Chore } from '../core/chores';
import { displayName } from '../../data/storage/preferences';

export type ErgonSettings = { started: boolean; me: string; notices: ChoreNoticeChoices; /** Chores that come round on a work day show on the next day off (from the Proairetos schedule). */ daysOff?: boolean; /** Names added to give chores to, kept even before a chore has them. */ people?: string[] };

/** The name used for Mine and for who did what: the one given here, else the name set in Proairetos. */
export function myName(current: ErgonSettings = settings.load()): string {
  return current.me.trim() || displayName();
}

/** Everyone a chore can be given to: this person, the names added, and every name on a chore. */
export function peopleFor(chores: readonly Chore[], current: ErgonSettings = settings.load()): string[] {
  const me = myName(current);
  const others = namesIn(chores, current.people ?? []).filter((name) => name !== me);
  return me ? [me, ...others] : others;
}

/** Keeps a new name for giving chores to. */
export function addPerson(name: string): void {
  const clean = name.trim();
  const current = settings.load();
  if (!clean || (current.people ?? []).includes(clean)) return;
  settings.save({ ...current, people: [...(current.people ?? []), clean] });
}

export const settings = stored<ErgonSettings>('ergon:settings', () => ({ started: false, me: '', notices: { ...defaultChoreNotices } }));

/** Chores kept on this device (and in the person's own account) while there is no shared home. */
export const ownChores = collection<Chore>('ergon:chore:');

/** A shared home: every chore sealed with the home's key; everyone with the invite sees and changes them. */
export const homes = createSharedLists<Chore>({
  listsKey: 'ergon:households',
  cachePrefix: 'ergonShared',
  label: 'ergon-list',
  order: (a, b) => a.createdAt.localeCompare(b.createdAt),
  defaultName: 'Home',
});

export { joinProof, sharingAvailable };

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

/** The shared home, if this person has one (Ergon keeps to one). */
export function home(): SharedListRef | undefined {
  return homes.sharedLists()[0];
}

let homeCache: { version: number; value: SharedListRef | undefined; items: Chore[] } | undefined;
function snapshot() {
  const version = homes.sharedVersion();
  if (!homeCache || homeCache.version !== version) {
    const value = home();
    homeCache = { version, value, items: value ? homes.sharedItems(value) : [] };
  }
  return homeCache;
}

export function useHome(): SharedListRef | undefined {
  return useSyncExternalStore(homes.subscribeShared, () => snapshot().value);
}

/** Every chore to show: the shared home's while there is one, else this device's own. */
export function useChores(): Chore[] {
  const own = ownChores.use();
  const shared = useSyncExternalStore(homes.subscribeShared, () => snapshot());
  // While a home is open, bring it up to date every 15 seconds the page is in view.
  useEffect(() => {
    const list = shared.value;
    if (!list) return;
    const pull = () => document.visibilityState === 'visible' && void homes.refreshList(list).catch(() => undefined);
    pull();
    const timer = window.setInterval(pull, 15_000);
    document.addEventListener('visibilitychange', pull);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pull);
    };
  }, [shared.value?.id]);
  return shared.value ? shared.items : own;
}

/** Every chore, read once (for notices). */
export function allChores(): Chore[] {
  const list = home();
  return list ? homes.sharedItems(list) : ownChores.list();
}

export function putChore(chore: Chore): void {
  const list = home();
  if (list) homes.changeItem(list, chore.id, chore);
  else ownChores.put(chore);
  notifications.refreshSoon();
}

export function removeChore(id: string): void {
  const list = home();
  if (list) homes.changeItem(list, id, null);
  else ownChores.remove(id);
  notifications.refreshSoon();
}

export function findChore(id: string): Chore | undefined {
  return allChores().find((chore) => chore.id === id);
}
