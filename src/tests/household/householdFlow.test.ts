// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The household from start to end against a stand-in server: one person makes it and shares chores and groceries,
 * another joins from the invite on their own device and finds both lists there; an app later taken out stays with
 * whoever already has it.
 */
type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = { shared_lists: [], shared_list_members: [], shared_list_items: [], household_app_shares: [], household_member_roles: [], household_invites: [] };
let user: string | null = 'user-a';

function query(table: string) {
  const filters: [string, unknown][] = [];
  let action: 'select' | 'delete' = 'select';
  const rows = () => tables[table].filter((row) => filters.every(([key, value]) => row[key] === value));
  const builder = {
    select: () => builder,
    delete: () => ((action = 'delete'), builder),
    eq: (key: string, value: unknown) => (filters.push([key, value]), builder),
    maybeSingle: async () => {
      const row = rows()[0];
      if (!row) return { data: null, error: null };
      if (table === 'shared_lists') {
        const share = tables.household_app_shares.find((each) => each.shared_list_id === row.id);
        const isMember = tables.shared_list_members.some((each) => each.list_id === row.id && each.user_id === user);
        const householdMember = share && tables.shared_list_members.some((each) => each.list_id === share.household_id && each.user_id === user);
        if (row.created_by !== user && !isMember) return { data: null, error: null };
        if (share && row.created_by !== user && share.owner_id !== user && (!share.enabled || !householdMember)) return { data: null, error: null };
      }
      return { data: row, error: null };
    },
    insert: async (row: Row) => (tables[table].push({ ...row }), { error: null }),
    upsert: async (row: Row) => {
      const at = tables[table].findIndex((each) => each.list_id === row.list_id && each.id === row.id);
      if (at >= 0) tables[table][at] = { ...row };
      else tables[table].push({ ...row });
      return { error: null };
    },
    then: (done: (value: { data: Row[] | null; error: null }) => void) => {
      if (action === 'delete') {
        const gone = new Set(rows());
        if (table === 'shared_list_members') {
          for (const member of gone) {
            for (const share of tables.household_app_shares.filter((each) => each.household_id === member.list_id)) {
              const appList = tables.shared_lists.find((each) => each.id === share.shared_list_id);
              tables.shared_list_members = tables.shared_list_members.filter((each) =>
                each.list_id !== share.shared_list_id ||
                each.user_id !== member.user_id ||
                each.user_id === appList?.created_by ||
                each.user_id === share.owner_id);
            }
          }
        }
        tables[table] = tables[table].filter((row) => !gone.has(row));
        return done({ data: null, error: null });
      }
      return done({ data: rows(), error: null });
    },
  };
  return builder;
}

const client = {
  auth: {
    getUser: async () => ({ data: { user: user ? { id: user, email: `${user}@example.test` } : null }, error: null }),
    getSession: async () => ({ data: { session: user ? { user: { id: user } } : null }, error: null }),
  },
  from: (table: string) => query(table),
  rpc: async (name: string, args: Record<string, unknown>) => {
    if (name === 'transfer_household_ownership') {
      const householdId = String(args.household);
      const target = String(args.new_owner);
      const row = tables.shared_lists.find((item) => item.id === householdId);
      if (!row) return { data: null, error: { message: 'That household no longer exists.' } };
      if (row.created_by !== user) return { data: null, error: { message: 'Only the household owner can transfer ownership.' } };
      if (target === row.created_by) return { data: null, error: { message: 'Choose another household member.' } };
      if (!tables.shared_list_members.some((item) => item.list_id === householdId && item.user_id === target)) {
        return { data: null, error: { message: 'The new owner must already be a member of this household.' } };
      }
      const previousOwner = row.created_by;
      row.created_by = target;
      tables.household_member_roles = tables.household_member_roles.filter((item) =>
        item.household_id !== householdId || (item.user_id !== previousOwner && item.user_id !== target));
      return { data: true, error: null };
    }
    if (name === 'delete_household') {
      const householdId = String(args.household);
      const row = tables.shared_lists.find((item) => item.id === householdId);
      if (!row) return { data: null, error: { message: 'That household no longer exists.' } };
      if (row.created_by !== user) return { data: null, error: { message: 'Only the household owner can delete this household.' } };
      const householdMembers = new Set(tables.shared_list_members.filter((item) => item.list_id === householdId).map((item) => item.user_id));
      for (const share of tables.household_app_shares.filter((item) => item.household_id === householdId)) {
        const appList = tables.shared_lists.find((item) => item.id === share.shared_list_id);
        tables.shared_list_members = tables.shared_list_members.filter((item) =>
          item.list_id !== share.shared_list_id ||
          !householdMembers.has(item.user_id) ||
          item.user_id === appList?.created_by ||
          item.user_id === share.owner_id ||
          item.user_id === row.created_by);
      }
      tables.shared_lists = tables.shared_lists.filter((item) => item.id !== householdId);
      tables.shared_list_members = tables.shared_list_members.filter((item) => item.list_id !== householdId);
      tables.shared_list_items = tables.shared_list_items.filter((item) => item.list_id !== householdId);
      tables.household_app_shares = tables.household_app_shares.filter((item) => item.household_id !== householdId);
      tables.household_member_roles = tables.household_member_roles.filter((item) => item.household_id !== householdId);
      tables.household_invites = tables.household_invites.filter((item) => item.household_id !== householdId);
      return { data: true, error: null };
    }
    if (name === 'set_household_member_role') {
      const householdId = String(args.household);
      const target = String(args.target_user);
      const role = String(args.new_role);
      const owner = tables.shared_lists.find((row) => row.id === householdId)?.created_by;
      if (owner !== user) return { data: null, error: { message: 'Only the household owner can change administrator roles.' } };
      if (!tables.shared_list_members.some((row) => row.list_id === householdId && row.user_id === target)) {
        return { data: null, error: { message: 'That person is no longer a member of this household.' } };
      }
      if (role === 'admin') {
        const existing = tables.household_member_roles.find((row) => row.household_id === householdId && row.user_id === target);
        if (existing) Object.assign(existing, { role: 'admin' });
        else tables.household_member_roles.push({ household_id: householdId, user_id: target, role: 'admin' });
      } else {
        tables.household_member_roles = tables.household_member_roles.filter((row) => row.household_id !== householdId || row.user_id !== target);
      }
      return { data: true, error: null };
    }
    if (name === 'remove_household_member') {
      const householdId = String(args.household);
      const target = String(args.target_user);
      const owner = tables.shared_lists.find((row) => row.id === householdId)?.created_by;
      const actorAdmin = tables.household_member_roles.some((row) => row.household_id === householdId && row.user_id === user);
      if (target === owner) return { data: null, error: { message: 'The household owner cannot be removed.' } };
      if (target === user) return { data: null, error: { message: 'Use Leave household to remove yourself.' } };
      if (owner !== user && !actorAdmin) return { data: null, error: { message: 'Only the owner or an administrator can remove members.' } };
      const targetAdmin = tables.household_member_roles.some((row) => row.household_id === householdId && row.user_id === target);
      if (actorAdmin && targetAdmin) return { data: null, error: { message: 'Administrators cannot remove another administrator.' } };
      for (const share of tables.household_app_shares.filter((row) => row.household_id === householdId)) {
        const appList = tables.shared_lists.find((row) => row.id === share.shared_list_id);
        tables.shared_list_members = tables.shared_list_members.filter((row) =>
          row.list_id !== share.shared_list_id || row.user_id !== target || row.user_id === appList?.created_by || row.user_id === share.owner_id);
      }
      tables.shared_list_items = tables.shared_list_items.filter((row) => row.list_id !== householdId || row.id !== `member:${target}`);
      tables.shared_list_members = tables.shared_list_members.filter((row) => row.list_id !== householdId || row.user_id !== target);
      tables.household_member_roles = tables.household_member_roles.filter((row) => row.household_id !== householdId || row.user_id !== target);
      tables.household_invites = tables.household_invites.filter((row) => row.household_id !== householdId || (row.to_user !== target && row.from_user !== target));
      return { data: true, error: null };
    }
    if (name === 'set_household_app_share') {
      const householdId = String(args.household);
      const app = String(args.app_name);
      const sharedListId = String(args.shared_list);
      const enabled = Boolean(args.share_enabled);
      if (!tables.shared_list_members.some((row) => row.list_id === householdId && row.user_id === user)) {
        return { data: null, error: { message: 'Join the household before changing its sharing settings.' } };
      }
      const existing = tables.household_app_shares.find((row) => row.household_id === householdId && row.app === app);
      if (existing && existing.owner_id !== user) {
        return { data: null, error: { message: 'Only the person who enabled this share can change it.' } };
      }
      if (enabled && !tables.shared_list_members.some((row) => row.list_id === sharedListId && row.user_id === user)) {
        return { data: null, error: { message: 'You need access to this app list before sharing it.' } };
      }
      if (existing) Object.assign(existing, { shared_list_id: sharedListId, enabled });
      else tables.household_app_shares.push({ household_id: householdId, app, shared_list_id: sharedListId, owner_id: user, enabled });
      return { data: true, error: null };
    }
    const list = tables.shared_lists.find((row) => row.id === args.list);
    if (!list || list.join_proof !== args.proof) return { data: false, error: null };
    const share = tables.household_app_shares.find((row) => row.shared_list_id === args.list);
    if (share && (!share.enabled || (!tables.shared_list_members.some((row) => row.list_id === share.household_id && row.user_id === user) && share.owner_id !== user))) {
      return { data: false, error: null };
    }
    tables.shared_list_members.push({ list_id: args.list, user_id: user });
    return { data: true, error: null };
  },
};

vi.mock('../../data/sync/supabase', () => ({ isSyncConfigured: true, supabase: async () => client, syncConfig: {}, signInProviders: [] }));

const device = (name: string) => {
  localStorage.clear();
  localStorage.setItem('proairetos.apps', JSON.stringify({ added: ['ergon', 'soma'] }));
  localStorage.setItem('proairetosOwned', JSON.stringify({ apps: [], tester: true }));
  localStorage.setItem('proairetos.displayName', JSON.stringify(name));
};

describe('a household', () => {
  beforeEach(() => {
    for (const key of Object.keys(tables)) tables[key] = [];
  });

  it('shares chosen apps with whoever joins from the invite', async () => {
    const household = await import('../../app/household/household');
    const { homes } = await import('../../ergon/app/state');
    const soma = await import('../../soma/data/sharedLists');

    user = 'user-a';
    device('Sam');
    await household.makeHousehold('The Smiths');
    await household.shareApp('ergon');
    await household.shareApp('soma');
    const made = household.household()!;
    await household.households.refreshList(made);
    await household.syncHousehold();
    const ergonList = homes.sharedLists()[0];
    homes.changeItem(ergonList, 'c1', { id: 'c1', name: 'Bins', createdAt: '2026-10-29' } as never);
    await homes.refreshList(ergonList);
    const invite = { id: made.id, key: made.key, name: made.name };

    user = 'user-b';
    device('Alex');
    await household.joinHousehold(invite);
    expect(homes.sharedLists().map((list) => list.id)).toEqual([ergonList.id]);
    expect(homes.sharedItems(homes.sharedLists()[0]).map((chore) => chore.id)).toEqual(['c1']);
    expect(soma.sharedLists()).toHaveLength(1);
    await household.syncHousehold();
    const items = household.households.sharedItems(household.household()!);
    expect(items.filter((item) => item.kind === 'member').map((item) => (item as { name: string }).name).sort()).toEqual(['Alex', 'Sam']);

    // Only the person who enabled a category can change it.
    await expect(household.stopSharing('ergon')).rejects.toThrow('Only the person who enabled this share can change it.');

    // Sam turns off Chores. The app-list permission is disabled before its household index entry is removed.
    user = 'user-a';
    await household.stopSharing('ergon');
    await household.households.refreshList(household.household()!);
    expect(tables.household_app_shares.find((row) => row.app === 'ergon')?.enabled).toBe(false);

    // An existing member loses server access on the next refresh; the stale local list and cache are cleared.
    user = 'user-b';
    await expect(homes.refreshList(ergonList)).rejects.toThrow('This list is no longer shared with you.');
    expect(homes.sharedLists()).toHaveLength(0);

    // A later family member joins the household but does not receive the disabled Ergon list.
    user = 'user-c';
    device('Jo');
    await household.joinHousehold(invite);
    expect(homes.sharedLists()).toHaveLength(0);
    expect(soma.sharedLists()).toHaveLength(1);
  });

  it('keeps cached household data while signed out or while another account is being restored', async () => {
    const household = await import('../../app/household/household');
    user = 'user-a';
    device('Sam');
    await household.makeHousehold('Family');
    await household.shareApp('ergon');
    const savedHousehold = household.household()!;
    const { homes } = await import('../../ergon/app/state');
    const savedAppList = homes.sharedLists()[0]!;

    user = null;
    await household.syncHousehold();
    await expect(household.households.refreshList(savedHousehold)).rejects.toThrow('Sign in to use shared lists.');
    expect(household.household()?.id).toBe(savedHousehold.id);
    expect(homes.sharedLists().map((each) => each.id)).toContain(savedAppList.id);

    user = 'user-b';
    localStorage.setItem('proairetosAccount', 'user-a');
    await household.syncHousehold();
    expect(household.household()?.id).toBe(savedHousehold.id);
    expect(homes.sharedLists().map((each) => each.id)).toContain(savedAppList.id);

    user = 'user-a';
    localStorage.setItem('proairetosAccount', 'user-a');
    await household.syncHousehold();
    expect(household.household()?.id).toBe(savedHousehold.id);
  });

  it('clears revoked app-list caches and rejoins connected lists when a member rejoins the household', async () => {
    const household = await import('../../app/household/household');
    const { homes } = await import('../../ergon/app/state');
    user = 'user-a';
    device('Sam');
    await household.makeHousehold('Family');
    await household.shareApp('ergon');
    const invite = { ...household.household()! };
    const ownerDevice = Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index)!;
        return [key, localStorage.getItem(key) ?? ''];
      }),
    );

    user = 'user-b';
    device('Alex');
    await household.joinHousehold(invite);
    const appList = homes.sharedLists()[0]!;
    const memberDevice = Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index)!;
        return [key, localStorage.getItem(key) ?? ''];
      }),
    );
    expect(tables.shared_list_members.some((row) => row.list_id === appList.id && row.user_id === 'user-b')).toBe(true);

    user = 'user-a';
    localStorage.clear();
    for (const [key, value] of Object.entries(ownerDevice)) localStorage.setItem(key, value);
    await household.removeHouseholdMember('user-b');
    expect(tables.shared_list_members.some((row) => row.list_id === invite.id && row.user_id === 'user-b')).toBe(false);
    expect(tables.shared_list_members.some((row) => row.list_id === appList.id && row.user_id === 'user-b')).toBe(false);

    user = 'user-b';
    localStorage.clear();
    for (const [key, value] of Object.entries(memberDevice)) localStorage.setItem(key, value);
    expect(navigator.onLine).toBe(true);
    expect((await client.from('shared_lists').select().eq('id', invite.id).maybeSingle()).data).toBeNull();
    await household.syncHousehold();
    expect(household.household()).toBeUndefined();
    expect(homes.sharedLists()).toHaveLength(0);
    expect(homes.sharedItems(appList)).toHaveLength(0);

    await household.joinHousehold(invite);
    expect(household.household()?.id).toBe(invite.id);
    expect(homes.sharedLists().map((each) => each.id)).toContain(appList.id);
    expect(tables.shared_list_members.some((row) => row.list_id === appList.id && row.user_id === 'user-b')).toBe(true);
  });

  it('can rejoin directly from an invite even when this device still has a stale household reference', async () => {
    const household = await import('../../app/household/household');
    const { homes } = await import('../../ergon/app/state');
    user = 'user-a';
    device('Sam');
    await household.makeHousehold('Family');
    await household.shareApp('ergon');
    const invite = { ...household.household()! };
    const snapshot = () => Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index)!;
        return [key, localStorage.getItem(key) ?? ''];
      }),
    );
    const restore = (values: Record<string, string>) => {
      localStorage.clear();
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    };
    const ownerDevice = snapshot();

    user = 'user-b';
    device('Alex');
    await household.joinHousehold(invite);
    const appList = homes.sharedLists()[0]!;
    const memberDevice = snapshot();

    user = 'user-a';
    restore(ownerDevice);
    await household.removeHouseholdMember('user-b');
    expect(tables.shared_list_members.some((row) => row.list_id === invite.id && row.user_id === 'user-b')).toBe(false);
    user = 'user-b';
    restore(memberDevice);
    expect(navigator.onLine).toBe(true);
    expect(household.household()?.id).toBe(invite.id);

    // No background sync runs between removal and opening the invite again.
    await household.joinHousehold(invite);
    expect(household.household()?.id).toBe(invite.id);
    expect(tables.shared_list_members.some((row) => row.list_id === invite.id && row.user_id === 'user-b')).toBe(true);
    expect(tables.shared_list_members.some((row) => row.list_id === appList.id && row.user_id === 'user-b')).toBe(true);
  });

  it('preserves the person who enabled a share when they leave, while revoking other household members', async () => {
    const household = await import('../../app/household/household');
    const { homes } = await import('../../ergon/app/state');

    user = 'user-b';
    device('List creator');
    const appList = await homes.createList('Chores');

    user = 'user-a';
    device('Share owner');
    await household.makeHousehold('Family');
    const invite = { ...household.household()! };
    const ownerDevice = Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index)!;
        return [key, localStorage.getItem(key) ?? ''];
      }),
    );

    user = 'user-b';
    device('List creator');
    await household.joinHousehold(invite);
    const memberDevice = Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index)!;
        return [key, localStorage.getItem(key) ?? ''];
      }),
    );

    user = 'user-a';
    localStorage.clear();
    for (const [key, value] of Object.entries(ownerDevice)) localStorage.setItem(key, value);
    await homes.joinList(appList);
    await household.shareApp('ergon');
    const ownerWithShare = Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index)!;
        return [key, localStorage.getItem(key) ?? ''];
      }),
    );

    user = 'user-b';
    localStorage.clear();
    for (const [key, value] of Object.entries(memberDevice)) localStorage.setItem(key, value);
    await household.syncHousehold();

    user = 'user-c';
    device('Member');
    await household.joinHousehold(invite);
    expect(tables.shared_list_members.some((row) => row.list_id === appList.id && row.user_id === 'user-a')).toBe(true);
    expect(tables.shared_list_members.some((row) => row.list_id === appList.id && row.user_id === 'user-c')).toBe(true);

    user = 'user-a';
    localStorage.clear();
    for (const [key, value] of Object.entries(ownerWithShare)) localStorage.setItem(key, value);
    await household.transferHouseholdOwnership('user-c');
    await household.leaveHousehold();

    expect(tables.shared_list_members.some((row) => row.list_id === appList.id && row.user_id === 'user-a')).toBe(true);
    expect(tables.shared_list_members.some((row) => row.list_id === appList.id && row.user_id === 'user-c')).toBe(true);
    expect(household.household()).toBeUndefined();
  });

  it('enforces owner, administrator and member permissions', async () => {
    const household = await import('../../app/household/household');
    const { homes } = await import('../../ergon/app/state');
    user = 'user-a';
    device('Sam');
    await household.makeHousehold('Family');
    await household.shareApp('ergon');
    const made = household.household()!;
    expect(homes.sharedLists()).toHaveLength(1);
    const sharedErgonList = homes.sharedLists()[0]!;

    user = 'user-b';
    device('Alex');
    await household.joinHousehold({ id: made.id, key: made.key, name: made.name });
    user = 'user-c';
    device('Jo');
    await household.joinHousehold({ id: made.id, key: made.key, name: made.name });
    const removedMemberAppList = await homes.joinList(sharedErgonList);
    await homes.refreshList(removedMemberAppList);
    expect(homes.sharedLists()).toHaveLength(1);

    user = 'user-a';
    await household.setMemberRole('user-b', 'admin');
    await household.setMemberRole('user-c', 'admin');
    expect(tables.household_member_roles).toContainEqual(expect.objectContaining({ household_id: made.id, user_id: 'user-b', role: 'admin' }));

    user = 'user-b';
    await expect(household.setMemberRole('user-a', 'admin')).rejects.toThrow('Only the household owner');
    await expect(household.removeHouseholdMember('user-a')).rejects.toThrow('owner cannot be removed');
    await expect(household.removeHouseholdMember('user-c')).rejects.toThrow('cannot remove another administrator');

    user = 'user-a';
    await household.setMemberRole('user-c', 'member');
    user = 'user-b';
    await household.removeHouseholdMember('user-c');
    expect(tables.shared_list_members.some((row) => row.list_id === made.id && row.user_id === 'user-c')).toBe(false);

    // Removal blocks the former member from the connected app list on their next sync.
    user = 'user-c';
    await expect(homes.refreshList(removedMemberAppList)).rejects.toThrow('This list is no longer shared with you.');
    expect(homes.sharedLists()).toHaveLength(0);

    user = 'user-a';
    await household.setMemberRole('user-b', 'member');
    expect(tables.household_member_roles.some((row) => row.user_id === 'user-b')).toBe(false);
    await household.removeHouseholdMember('user-b');
    expect(tables.shared_list_members.some((row) => row.list_id === made.id && row.user_id === 'user-b')).toBe(false);
    expect(household.households.sharedItems(made).some((item) => item.id === 'member:user-b')).toBe(false);
  });

  it('transfers ownership and deletes a household without deleting app-list data', async () => {
    const household = await import('../../app/household/household');
    const { homes } = await import('../../ergon/app/state');
    user = 'user-a';
    device('Sam');
    await household.makeHousehold('Family');
    await household.shareApp('ergon');
    const made = household.household()!;
    const appList = homes.sharedLists()[0]!;

    user = 'user-b';
    device('Alex');
    await household.joinHousehold({ id: made.id, key: made.key, name: made.name });
    await homes.joinList(appList);
    user = 'user-c';
    device('Jo');
    await household.joinHousehold({ id: made.id, key: made.key, name: made.name });
    await homes.joinList(appList);
    expect(tables.shared_list_members.filter((item) => item.list_id === appList.id).map((item) => item.user_id)).toEqual(['user-a', 'user-b', 'user-c']);

    user = 'user-a';
    await household.transferHouseholdOwnership('user-b');
    expect(tables.shared_lists.find((item) => item.id === made.id)?.created_by).toBe('user-b');
    expect(tables.household_member_roles.some((item) => item.household_id === made.id && item.user_id === 'user-b')).toBe(false);

    user = 'user-a';
    await expect(household.setMemberRole('user-c', 'admin')).rejects.toThrow('Only the household owner');
    await expect(household.deleteHousehold()).rejects.toThrow('Only the household owner');
    user = 'user-b';
    await expect(household.transferHouseholdOwnership('user-x')).rejects.toThrow('must already be a member');
    await household.removeHouseholdMember('user-c');
    expect(tables.shared_list_members.some((item) => item.list_id === appList.id && item.user_id === 'user-c')).toBe(false);
    await household.deleteHousehold();

    expect(tables.shared_lists.some((item) => item.id === made.id)).toBe(false);
    expect(tables.household_app_shares.some((item) => item.household_id === made.id)).toBe(false);
    expect(tables.shared_lists.some((item) => item.id === appList.id)).toBe(true);
    expect(tables.shared_list_members.filter((item) => item.list_id === appList.id).map((item) => item.user_id).sort()).toEqual(['user-a', 'user-b']);
    expect(household.household()).toBeUndefined();
  });

  it('does not connect a standalone app list that includes people outside the family', async () => {
    const household = await import('../../app/household/household');
    const { homes } = await import('../../ergon/app/state');
    user = 'user-a';
    device('Sam');
    const oldHome = await homes.createList('Old home');
    tables.shared_list_members.push({ list_id: oldHome.id, user_id: 'user-outside' });

    await household.makeHousehold('Family');
    await expect(household.shareApp('ergon')).rejects.toThrow('already shared with someone outside this family');
    expect(household.households.sharedItems(household.household()!).some((item) => item.kind === 'part' && item.app === 'ergon')).toBe(false);
  });

  it('leaves an app that already shares elsewhere alone', async () => {
    const household = await import('../../app/household/household');
    const { homes } = await import('../../ergon/app/state');
    user = 'user-a';
    device('Sam');
    await household.makeHousehold('Home');
    await household.shareApp('ergon');
    const made = household.household()!;
    await household.households.refreshList(made);

    user = 'user-c';
    device('Jo');
    const own = await homes.createList('Flat');
    await household.joinHousehold({ id: made.id, key: made.key, name: made.name });
    expect(homes.sharedLists().map((list) => list.id)).toEqual([own.id]);
  });
});
