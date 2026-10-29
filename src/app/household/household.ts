import { useEffect, useSyncExternalStore } from 'react';
import { createSharedLists, sharingAvailable, type SharedListRef } from '../family/sharedLists';
import { HOUSEHOLD_APPS, memberId, membersOf, partId, partState, partsOf, type HouseholdApp, type HouseholdItem, type ListRef, type PartState } from '../../core/household/household';
import { displayName } from '../../data/storage/preferences';
import { supabase } from '../../data/sync/supabase';
import { isAdded } from '../family/added';

/**
 * The household (Settings > Household): one sealed shared list whose items name the apps sharing with it and who is
 * in it (`core/household/household.ts`). Which household this person has is the synced setting `proairetos.household`;
 * each app's own list lives in that app's setting as before, so every app and device follows through sync.
 * The apps' list modules are loaded only when a household needs them, so Proairetos's first chunk carries no other app.
 */
export const households = createSharedLists<HouseholdItem>({
  listsKey: 'proairetos.household',
  cachePrefix: 'proairetosHousehold',
  label: 'proairetos-household',
  defaultName: 'Home',
});

export { sharingAvailable };

type Lists = {
  sharedLists: () => SharedListRef[];
  createList: (name: string) => Promise<SharedListRef>;
  joinList: (invite: ListRef) => Promise<SharedListRef>;
  refreshList: (list: SharedListRef) => Promise<void>;
};

/** Each app's own shared lists, loaded when needed. */
async function listsOf(app: HouseholdApp): Promise<Lists> {
  switch (app) {
    case 'proairetos':
      return (await import('../together/together')).togetherLists;
    case 'soma':
      return await import('../../soma/data/sharedLists');
    case 'ergon':
      return (await import('../../ergon/app/state')).homes;
    case 'phyton':
      return (await import('../../phyton/app/state')).homes;
    case 'therapeia':
      return (await import('../../therapeia/app/state')).circles;
  }
}

/** Proairetos's own to-dos are always offered; an add-on only while it is added. */
export const offered = (app: HouseholdApp) => app === 'proairetos' || isAdded(app);

export const household = (): SharedListRef | undefined => households.sharedLists()[0];

// ---------- Where this device stands with each part ----------

let states: Partial<Record<HouseholdApp, PartState>> = {};
let statesVersion = 0;
const stateListeners = new Set<() => void>();
const setStates = (next: Partial<Record<HouseholdApp, PartState>>) => {
  states = next;
  statesVersion += 1;
  for (const listener of stateListeners) listener();
};

async function me(): Promise<string | undefined> {
  return (await signedInAs())?.id;
}

async function signedInAs(): Promise<{ id: string; email: string } | undefined> {
  const { data } = await (await supabase()).auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? '' } : undefined;
}

let running: Promise<void> | undefined;

/**
 * Brings the household up to date: reads it, writes this person's name in it, and joins every part's list this
 * device does not have yet (an app that keeps to one list and already shares elsewhere is left as it is).
 */
export function syncHousehold(): Promise<void> {
  if (running) return running;
  running = (async () => {
    const list = household();
    if (!list) return setStates({});
    await households.refreshList(list);
    const items = households.sharedItems(list);
    const user = await signedInAs();
    const userId = user?.id;
    const name = displayName().trim() || user?.email.split('@')[0] || 'Someone';
    const mine = userId ? items.find((item) => item.id === memberId(userId)) : undefined;
    if (user && userId && (!mine || (mine.kind === 'member' && (mine.name !== name || mine.email !== user.email)))) {
      households.changeItem(list, memberId(userId), { id: memberId(userId), kind: 'member', name, email: user.email, at: mine?.at ?? new Date().toISOString() });
    }
    const next: Partial<Record<HouseholdApp, PartState>> = {};
    for (const part of partsOf(items)) {
      if (!offered(part.app)) continue;
      const single = HOUSEHOLD_APPS.find((each) => each.app === part.app)?.single ?? true;
      try {
        const lists = await listsOf(part.app);
        const state = partState(part, lists.sharedLists(), single);
        if (state === 'join') {
          const joined = await lists.joinList(part.list);
          await lists.refreshList(joined).catch(() => undefined);
          next[part.app] = 'shared';
        } else next[part.app] = state;
      } catch {
        // Tried again on the next look.
      }
    }
    setStates(next);
  })().finally(() => {
    running = undefined;
  });
  return running;
}

/** Shares one app with the household: the list it already shares through, else a new one named after the household. */
export async function shareApp(app: HouseholdApp): Promise<void> {
  const list = household();
  if (!list) return;
  const lists = await listsOf(app);
  const single = HOUSEHOLD_APPS.find((each) => each.app === app)?.single ?? true;
  const own = single ? lists.sharedLists()[0] : undefined;
  const shared = own ?? (await lists.createList(app === 'soma' ? 'Groceries' : list.name));
  households.changeItem(list, partId(app), { id: partId(app), kind: 'part', app, list: { id: shared.id, key: shared.key, name: shared.name }, at: new Date().toISOString() });
  setStates({ ...states, [app]: 'shared' });
}

/** Takes an app out of the household: no one new joins it; whoever has it keeps it. */
export function stopSharing(app: HouseholdApp): HouseholdItem | undefined {
  const list = household();
  if (!list) return undefined;
  const before = households.sharedItems(list).find((item) => item.id === partId(app));
  households.changeItem(list, partId(app), null);
  return before;
}

/** Puts a part back (undo). */
export function restorePart(item: HouseholdItem): void {
  const list = household();
  if (list) households.changeItem(list, item.id, item);
}

export async function makeHousehold(name: string): Promise<void> {
  await households.createList(name);
  await syncHousehold();
}

export async function joinHousehold(invite: ListRef): Promise<void> {
  const current = household();
  if (current && current.id !== invite.id) await leaveHousehold();
  await households.joinList(invite);
  await syncHousehold();
}

/** Leaves the household on this device; each app's shared list stays until left in that app. */
export async function leaveHousehold(): Promise<void> {
  const list = household();
  if (!list) return;
  const userId = await me().catch(() => undefined);
  if (userId) {
    households.changeItem(list, memberId(userId), null);
    await households.refreshList(list).catch(() => undefined);
  }
  await households.leaveList(list);
  setStates({});
}

// ---------- For the page ----------

let snapshot: { key: string; value: HouseholdView } | undefined;
type HouseholdView = { list?: SharedListRef; items: HouseholdItem[]; states: Partial<Record<HouseholdApp, PartState>> };

function view(): HouseholdView {
  const key = `${households.sharedVersion()}|${statesVersion}`;
  if (snapshot?.key === key) return snapshot.value;
  const list = household();
  const value = { list, items: list ? households.sharedItems(list) : [], states };
  snapshot = { key, value };
  return value;
}

function subscribe(listener: () => void): () => void {
  const off = households.subscribeShared(listener);
  stateListeners.add(listener);
  return () => {
    off();
    stateListeners.delete(listener);
  };
}

/** The household as it stands, kept fresh while the page shows: on showing, every 15 s and on coming back into view. */
export function useHousehold(): HouseholdView & { parts: ReturnType<typeof partsOf>; members: ReturnType<typeof membersOf> } {
  const value = useSyncExternalStore(subscribe, view, view);
  useEffect(() => {
    if (!value.list) return;
    const pull = () => document.visibilityState === 'visible' && void syncHousehold().catch(() => undefined);
    pull();
    const timer = window.setInterval(pull, 15_000);
    document.addEventListener('visibilitychange', pull);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pull);
    };
  }, [value.list?.id]);
  return { ...value, parts: partsOf(value.items), members: membersOf(value.items) };
}

let started = false;

/** On start and on coming back into view, a household brings in any app newly shared with it. */
export function startHousehold(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const look = () => {
    if (document.visibilityState !== 'visible' || !sharingAvailable) return;
    // Invites by email: this account's key is made once its data is open, and what waits for it is read.
    void import('./invites').then((invites) => invites.refreshInvites()).catch(() => undefined);
    if (household()) void syncHousehold().catch(() => undefined);
  };
  window.setTimeout(look, 3000);
  document.addEventListener('visibilitychange', look);
  window.setInterval(look, 5 * 60_000);
}

// ---------- Invites ----------

const INVITE = 'proairetosHousehold.invite';

export function pendingHouseholdInvite(): ListRef | undefined {
  try {
    const raw = sessionStorage.getItem(INVITE);
    return raw ? (JSON.parse(raw) as ListRef) : undefined;
  } catch {
    return undefined;
  }
}

export function keepHouseholdInvite(invite: ListRef): void {
  try {
    sessionStorage.setItem(INVITE, JSON.stringify(invite));
  } catch {
    // Without session storage the link can be opened again.
  }
}

export function dropHouseholdInvite(): void {
  try {
    sessionStorage.removeItem(INVITE);
  } catch {
    // Nothing kept.
  }
}
