import { useEffect, useSyncExternalStore } from 'react';
import { collection, stored } from '../../app/family/shell';
import { createSharedLists, joinProof, sharingAvailable, type SharedListRef } from '../../app/family/sharedLists';
import { notifications } from '../../app/notify/notifications';
import { defaultChoreNotices, type ChoreNoticeChoices } from '../core/notices';
import { namesIn, type Chore } from '../core/chores';
import { displayName } from '../../data/storage/preferences';
import { householdActor } from '../../app/household/household';

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

function recordHouseholdActivity(chore: Chore, before: Chore | undefined, actor: { id?: string; name: string }): Chore {
  const previous = before ? { ...before, activity: undefined } : undefined;
  const next = { ...chore, activity: undefined };
  if (previous && JSON.stringify(previous) === JSON.stringify(next)) return chore;

  const historyChanged = Boolean(before && JSON.stringify(before.history) !== JSON.stringify(chore.history) && chore.history.length >= before.history.length);
  const assignmentChanged = Boolean(before && (before.whoId !== chore.whoId || before.who !== chore.who));
  const action = !before ? 'added' : historyChanged ? 'completed' : assignmentChanged ? 'assigned' : 'changed';
  const at = new Date().toISOString();
  let history = chore.history;
  if (historyChanged && actor.id) {
    const last = history.at(-1);
    if (last && !last.byId) history = [...history.slice(0, -1), { ...last, byId: actor.id, by: last.by ?? actor.name, at: last.at ?? at }];
  }
  const event = {
    id: newId(),
    action,
    at,
    by: actor.name,
    byId: actor.id,
    ...(assignmentChanged && action === 'assigned' ? { assignedTo: chore.who ?? 'Anyone', assignedToId: chore.whoId } : {}),
    ...(assignmentChanged && action === 'completed' ? { nextAssignee: chore.who ?? 'Anyone', nextAssigneeId: chore.whoId } : {}),
  } as const;
  return { ...chore, history, activity: [...(before?.activity ?? chore.activity ?? []), event].slice(-40) };
}

export function putChore(chore: Chore): void {
  const list = home();
  const existing = (list ? homes.sharedItems(list) : ownChores.list()).find((item) => item.id === chore.id);
  const actor = list ? householdActor('ergon') : undefined;
  const next = actor ? recordHouseholdActivity(chore, existing, actor) : chore;
  if (list) homes.changeItem(list, chore.id, next);
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
