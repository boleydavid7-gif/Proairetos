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
export type HouseholdRole = 'owner' | 'admin' | 'member';
type RoleState = { householdId?: string; ownerId?: string; admins: string[]; userId?: string; loaded: boolean; fetchedAt?: number };
let roleState: RoleState = { admins: [], loaded: false };
let statesVersion = 0;
const stateListeners = new Set<() => void>();
const setStates = (next: Partial<Record<HouseholdApp, PartState>>) => {
  states = next;
  statesVersion += 1;
  for (const listener of stateListeners) listener();
};

const setRoleState = (next: RoleState) => {
  roleState = next;
  statesVersion += 1;
  for (const listener of stateListeners) listener();
};

async function refreshRoleState(householdId: string, userId?: string): Promise<void> {
  if (roleState.householdId === householdId && roleState.userId === userId && Date.now() - (roleState.fetchedAt ?? 0) < 15_000) return;
  try {
    const client = await supabase();
    const [{ data: householdRow, error: householdError }, { data: adminRows, error: rolesError }] = await Promise.all([
      client.from('shared_lists').select('created_by').eq('id', householdId).maybeSingle(),
      client.from('household_member_roles').select('user_id').eq('household_id', householdId),
    ]);
    if (userId && !(await stillSignedInAs(userId))) return;
    if (householdError || !householdRow) {
      setRoleState({ householdId, admins: [], userId, loaded: false, fetchedAt: Date.now() });
      return;
    }
    const ownerId = (householdRow as { created_by: string }).created_by;
    if (rolesError) {
      // Even if the role migration is not installed yet, we can still identify the owner and prevent an orphaned home.
      setRoleState({ householdId, ownerId, admins: [], userId, loaded: false, fetchedAt: Date.now() });
      return;
    }
    setRoleState({
      householdId,
      ownerId,
      admins: ((adminRows ?? []) as { user_id: string }[]).map((row) => row.user_id),
      userId,
      loaded: true,
      fetchedAt: Date.now(),
    });
  } catch {
    if (userId && !(await stillSignedInAs(userId))) return;
    setRoleState({ householdId, admins: [], userId, loaded: false, fetchedAt: Date.now() });
  }
}

async function me(): Promise<string | undefined> {
  return (await signedInAs())?.id;
}

async function signedInAs(): Promise<{ id: string; email: string } | undefined> {
  const { data, error } = await (await supabase()).auth.getUser();
  return !error && data.user ? { id: data.user.id, email: data.user.email ?? '' } : undefined;
}

function belongsToDeviceAccount(userId: string): boolean {
  try {
    const deviceAccount = localStorage.getItem('proairetosAccount');
    return !deviceAccount || deviceAccount === userId;
  } catch {
    return true;
  }
}

async function stillSignedInAs(userId: string): Promise<boolean> {
  if (!belongsToDeviceAccount(userId)) return false;
  const user = await signedInAs().catch(() => undefined);
  return user?.id === userId && belongsToDeviceAccount(userId);
}

async function setAppShare(householdId: string, app: HouseholdApp, sharedListId: string, enabled: boolean): Promise<void> {
  const { data, error } = await (await supabase()).rpc('set_household_app_share', {
    household: householdId,
    app_name: app,
    shared_list: sharedListId,
    share_enabled: enabled,
  });
  if (error) {
    if (/set_household_app_share|household_app_shares|schema cache|function .* does not exist/i.test(error.message)) {
      throw new Error('Family sharing permissions are not set up on the server yet.');
    }
    throw new Error(error.message);
  }
  if (data !== true) throw new Error('The family sharing setting could not be saved.');
}

let running: { key: string; promise: Promise<void> } | undefined;

function isRevokedList(cause: unknown): boolean {
  return cause instanceof Error && /This list is no longer shared with you/i.test(cause.message);
}

function cannotJoinList(cause: unknown): boolean {
  return cause instanceof Error && /This link does not open a list/i.test(cause.message);
}

/** Re-check old app-list references when a household share disappears or household membership is revoked. */
async function refreshLinkedParts(parts: readonly Extract<HouseholdItem, { kind: 'part' }>[], userId: string): Promise<void> {
  const checked = new Set<string>();
  for (const part of parts) {
    const key = `${part.app}:${part.list.id}`;
    if (checked.has(key)) continue;
    checked.add(key);
    if (!(await stillSignedInAs(userId))) return;
    try {
      const lists = await listsOf(part.app);
      // A successful check preserves personal access (the list creator or share owner); a denied check clears
      // only this device's stale reference, cached copy and unsent queue.
      await lists.refreshList(part.list);
    } catch {
      // The next online household check can retry a transient failure.
    }
  }
}

/**
 * Reconciles this account's household and every connected app list. Authentication and the device-account marker
 * are checked before any server read, so a signed-out or switching account never looks like a revoked member.
 */
export async function syncHousehold(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const user = await signedInAs().catch(() => undefined);
  if (!user || !belongsToDeviceAccount(user.id)) return;

  const list = household();
  if (!list) {
    setStates({});
    setRoleState({ admins: [], loaded: false });
    return;
  }

  const runKey = `${user.id}:${list.id}`;
  if (running?.key === runKey) return running.promise;

  const work = (async () => {
    // Keep the cached index before refreshing it. If access was revoked, its app-list references are still needed
    // to check and clear the corresponding local app caches.
    const previousItems = households.sharedItems(list);
    try {
      await households.refreshList(list);
    } catch (cause) {
      if (!isRevokedList(cause)) throw cause;
      await refreshLinkedParts(partsOf(previousItems), user.id);
      if (await stillSignedInAs(user.id)) {
        setStates({});
        setRoleState({ admins: [], loaded: false });
      }
      return;
    }
    if (!(await stillSignedInAs(user.id))) return;

    const items = households.sharedItems(list);
    const previousParts = partsOf(previousItems);
    const currentParts = partsOf(items);
    const currentPartKeys = new Set(currentParts.map((part) => `${part.app}:${part.list.id}`));
    const removedParts = previousParts.filter((part) => !currentPartKeys.has(`${part.app}:${part.list.id}`));
    if (removedParts.length) await refreshLinkedParts(removedParts, user.id);
    if (!(await stillSignedInAs(user.id))) return;

    await refreshRoleState(list.id, user.id);
    if (!(await stillSignedInAs(user.id))) return;

    const name = displayName().trim() || user.email.split('@')[0] || 'Someone';
    const mine = items.find((item) => item.id === memberId(user.id));
    if (!mine || (mine.kind === 'member' && (mine.name !== name || mine.email !== user.email))) {
      households.changeItem(list, memberId(user.id), {
        id: memberId(user.id),
        kind: 'member',
        name,
        email: user.email,
        at: mine?.at ?? new Date().toISOString(),
      });
    }

    const next: Partial<Record<HouseholdApp, PartState>> = {};
    for (const part of currentParts) {
      if (!offered(part.app)) continue;
      if (!(await stillSignedInAs(user.id))) return;
      const single = HOUSEHOLD_APPS.find((each) => each.app === part.app)?.single ?? true;
      try {
        const lists = await listsOf(part.app);
        const existing = lists.sharedLists().find((each) => each.id === part.list.id);
        if (existing) {
          try {
            await lists.refreshList(existing);
            next[part.app] = 'shared';
            continue;
          } catch (cause) {
            if (!isRevokedList(cause)) continue;
            // A member may have left and then rejoined while this device was offline. The household index is
            // current, so try the app-list invite again after the stale local reference has been cleared.
          }
        } else {
          const state = partState(part, lists.sharedLists(), single);
          if (state === 'elsewhere') {
            next[part.app] = state;
            continue;
          }
        }

        try {
          const joined = await lists.joinList(part.list);
          await lists.refreshList(joined);
          next[part.app] = 'shared';
        } catch (cause) {
          if (cannotJoinList(cause) || isRevokedList(cause)) next[part.app] = 'unavailable';
        }
      } catch {
        // Network errors are retried on the next visible or scheduled household check.
      }
    }
    if (await stillSignedInAs(user.id)) setStates(next);
  })();

  running = { key: runKey, promise: work };
  try {
    await work;
  } finally {
    if (running?.promise === work) running = undefined;
  }
}

/** Shares one app with the household: the list it already shares through, else a new one named after the household. */
export async function shareApp(app: HouseholdApp): Promise<void> {
  const list = household();
  if (!list) return;
  const lists = await listsOf(app);
  const single = HOUSEHOLD_APPS.find((each) => each.app === app)?.single ?? true;
  const own = single ? lists.sharedLists()[0] : undefined;
  const shared = own ?? (await lists.createList(app === 'soma' ? 'Groceries' : list.name));

  // Never silently fold a standalone list into a family if it already contains people outside that family.
  // They would lose server access once the household permission is applied.
  const client = await supabase();
  const { data: householdMembers, error: householdMembersError } = await client.from('shared_list_members').select('user_id').eq('list_id', list.id);
  if (householdMembersError) throw new Error(householdMembersError.message);
  const familyMembers = new Set(((householdMembers ?? []) as { user_id: string }[]).map((member) => member.user_id));
  const { data: listMembers, error: membersError } = await client.from('shared_list_members').select('user_id').eq('list_id', shared.id);
  if (membersError) throw new Error(membersError.message);
  const outsideMembers = ((listMembers ?? []) as { user_id: string }[]).filter((member) => !familyMembers.has(member.user_id));
  if (outsideMembers.length) {
    throw new Error('This list is already shared with someone outside this family. Add them to the family first before connecting it.');
  }

  // Persist the access rule before publishing the encrypted app-list reference to the household.
  await setAppShare(list.id, app, shared.id, true);
  households.changeItem(list, partId(app), { id: partId(app), kind: 'part', app, list: { id: shared.id, key: shared.key, name: shared.name }, at: new Date().toISOString() });
  await households.refreshList(list);
  setStates({ ...states, [app]: 'shared' });
}

/** Stops household members from accessing this app list on their next server sync. */
export async function stopSharing(app: HouseholdApp): Promise<HouseholdItem | undefined> {
  const list = household();
  if (!list) return undefined;
  const before = households.sharedItems(list).find((item) => item.id === partId(app));
  if (before?.kind !== 'part') return undefined;
  await setAppShare(list.id, app, before.list.id, false);
  households.changeItem(list, partId(app), null);
  await households.refreshList(list);
  return before;
}

/** Puts a part back (undo), restoring the server permission before the household index. */
export async function restorePart(item: HouseholdItem): Promise<void> {
  const list = household();
  if (!list || item.kind !== 'part') return;
  await setAppShare(list.id, item.app, item.list.id, true);
  households.changeItem(list, item.id, item);
  await households.refreshList(list);
}

/** Only the household owner can promote or demote administrators. */
export async function setMemberRole(targetUserId: string, role: 'admin' | 'member'): Promise<void> {
  const list = household();
  if (!list) throw new Error('There is no household to manage.');
  const { data, error } = await (await supabase()).rpc('set_household_member_role', {
    household: list.id,
    target_user: targetUserId,
    new_role: role,
  });
  if (error) {
    if (/household_member_roles|set_household_member_role|schema cache|function .* does not exist/i.test(error.message)) {
      throw new Error('Family member roles are not set up on the server yet.');
    }
    throw new Error(error.message);
  }
  if (data !== true) throw new Error('The member role could not be saved.');
  setRoleState({
    ...roleState,
    fetchedAt: Date.now(),
    admins: role === 'admin'
      ? [...new Set([...roleState.admins, targetUserId])]
      : roleState.admins.filter((id) => id !== targetUserId),
  });
}

/** Transfers household ownership to an existing member. The former owner becomes a regular member. */
export async function transferHouseholdOwnership(targetUserId: string): Promise<void> {
  const list = household();
  if (!list) throw new Error('There is no household to manage.');
  if (!targetUserId) throw new Error('Choose a household member.');
  const { data, error } = await (await supabase()).rpc('transfer_household_ownership', {
    household: list.id,
    new_owner: targetUserId,
  });
  if (error) {
    if (/transfer_household_ownership|schema cache|function .* does not exist/i.test(error.message)) {
      throw new Error('Household ownership controls are not set up on the server yet.');
    }
    throw new Error(error.message);
  }
  if (data !== true) throw new Error('Household ownership could not be transferred.');
  setRoleState({
    ...roleState,
    ownerId: targetUserId,
    admins: roleState.admins.filter((id) => id !== targetUserId && id !== roleState.userId),
    loaded: true,
    fetchedAt: Date.now(),
  });
}

/** Deletes the household and its sharing rules, while preserving the underlying app lists and their owners' access. */
export async function deleteHousehold(): Promise<void> {
  const list = household();
  if (!list) throw new Error('There is no household to delete.');
  const current = await signedInAs();
  if (!current || !belongsToDeviceAccount(current.id)) throw new Error('Sign in to delete this household.');
  const userId = current.id;
  const linkedParts = partsOf(households.sharedItems(list));
  const { data, error } = await (await supabase()).rpc('delete_household', {
    household: list.id,
  });
  if (error) {
    if (/delete_household|schema cache|function .* does not exist/i.test(error.message)) {
      throw new Error('Household deletion is not set up on the server yet.');
    }
    throw new Error(error.message);
  }
  if (data !== true) throw new Error('The household could not be deleted.');
  // Preserve each app list only where this account still has independent creator/share-owner access.
  await households.leaveList(list);
  await refreshLinkedParts(linkedParts, userId);
  setStates({});
  setRoleState({ admins: [], loaded: false });
}

/** Removes a member on the server, then removes their encrypted profile from the household list. */
export async function removeHouseholdMember(targetUserId: string): Promise<void> {
  const list = household();
  if (!list) throw new Error('There is no household to manage.');
  const { data, error } = await (await supabase()).rpc('remove_household_member', {
    household: list.id,
    target_user: targetUserId,
  });
  if (error) {
    if (/remove_household_member|household_invites|schema cache|function .* does not exist/i.test(error.message)) {
      throw new Error('Family member management is not set up on the server yet.');
    }
    throw new Error(error.message);
  }
  if (data !== true) throw new Error('The member could not be removed.');
  households.changeItem(list, memberId(targetUserId), null);
  await households.refreshList(list);
  setRoleState({
    ...roleState,
    fetchedAt: Date.now(),
    admins: roleState.admins.filter((id) => id !== targetUserId),
  });
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
  if (roleState.householdId !== list.id || roleState.userId !== userId || !roleState.fetchedAt || Date.now() - roleState.fetchedAt > 60_000) {
    await refreshRoleState(list.id, userId);
  }
  if (!roleState.ownerId) {
    throw new Error('Could not verify household ownership. Check your connection and try again.');
  }
  if (userId && roleState.ownerId === userId) {
    throw new Error('The household owner cannot leave yet. Ownership transfer is not available.');
  }
  const linkedParts = partsOf(households.sharedItems(list));
  if (userId) {
    households.changeItem(list, memberId(userId), null);
    await households.refreshList(list).catch(() => undefined);
  }
  await households.leaveList(list);
  if (userId) await refreshLinkedParts(linkedParts, userId);
  setStates({});
  setRoleState({ admins: [], loaded: false });
}

// ---------- For the page ----------

let snapshot: { key: string; value: HouseholdView } | undefined;
type HouseholdView = {
  list?: SharedListRef;
  items: HouseholdItem[];
  states: Partial<Record<HouseholdApp, PartState>>;
  roles: Record<string, HouseholdRole>;
  currentUserId?: string;
  currentRole?: HouseholdRole;
  rolesReady: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
};

function view(): HouseholdView {
  const key = `${households.sharedVersion()}|${statesVersion}`;
  if (snapshot?.key === key) return snapshot.value;
  const list = household();
  const roles: Record<string, HouseholdRole> = {};
  if (roleState.ownerId) roles[roleState.ownerId] = 'owner';
  for (const id of roleState.admins) roles[id] = 'admin';
  const currentRole = roleState.userId ? roles[roleState.userId] ?? 'member' : undefined;
  const canManageMembers = roleState.loaded && (currentRole === 'owner' || currentRole === 'admin');
  const canManageRoles = roleState.loaded && currentRole === 'owner';
  const value = {
    list,
    items: list ? households.sharedItems(list) : [],
    states,
    roles,
    currentUserId: roleState.userId,
    currentRole,
    rolesReady: roleState.loaded,
    canManageMembers,
    canManageRoles,
  };
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
