// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The household from start to end against a stand-in server: one person makes it and shares chores and groceries,
 * another joins from the invite on their own device and finds both lists there; an app later taken out stays with
 * whoever already has it.
 */
type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = { shared_lists: [], shared_list_members: [], shared_list_items: [], household_app_shares: [] };
let user = 'user-a';

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
        const householdMember = share && tables.shared_list_members.some((each) => each.list_id === share.household_id && each.user_id === user);
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
        tables[table] = tables[table].filter((row) => !gone.has(row));
        return done({ data: null, error: null });
      }
      return done({ data: rows(), error: null });
    },
  };
  return builder;
}

const client = {
  auth: { getUser: async () => ({ data: { user: { id: user } } }) },
  from: (table: string) => query(table),
  rpc: async (name: string, args: Record<string, unknown>) => {
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
