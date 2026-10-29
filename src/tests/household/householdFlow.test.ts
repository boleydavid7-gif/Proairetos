// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The household from start to end against a stand-in server: one person makes it and shares chores and groceries,
 * another joins from the invite on their own device and finds both lists there; an app later taken out stays with
 * whoever already has it.
 */
type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = { shared_lists: [], shared_list_members: [], shared_list_items: [] };
let user = 'user-a';

function query(table: string) {
  const filters: [string, unknown][] = [];
  let action: 'select' | 'delete' = 'select';
  const rows = () => tables[table].filter((row) => filters.every(([key, value]) => row[key] === value));
  const builder = {
    select: () => builder,
    delete: () => ((action = 'delete'), builder),
    eq: (key: string, value: unknown) => (filters.push([key, value]), builder),
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
  rpc: async (_name: string, args: { list: string; proof: string }) => {
    const list = tables.shared_lists.find((row) => row.id === args.list);
    if (!list || list.join_proof !== args.proof) return { data: false, error: null };
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

    // Taken out of the household: Alex keeps the chores list already joined.
    household.stopSharing('ergon');
    await household.households.refreshList(household.household()!);
    await household.syncHousehold();
    expect(homes.sharedLists()).toHaveLength(1);
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
