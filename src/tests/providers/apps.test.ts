import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { searchProjections, type HostContext, type Provider } from '../../core/providers';

/*
 * What each app lets universal search hold. A canary value sits in every excluded field of a record; none may appear in
 * any row, and each allowed field must. Records are handed over through the same `records` call the device uses.
 */
const TODAY = '2026-11-05';
const ctxFor = (records: Record<string, unknown[]>): HostContext => ({
  today: TODAY,
  now: new Date(`${TODAY}T12:00:00`),
  records: async <T,>(source: string) => (records[source] ?? []) as T[],
  setting: () => null,
  isUsable: () => true,
  enabled: () => true,
});
const run = async (provider: Provider<'search'>, records: Record<string, unknown[]>) => {
  const out = await searchProjections([provider], APPS, ctxFor(records));
  expect(out.rejected).toEqual([]);
  return out.results;
};
const text = (rows: unknown) => JSON.stringify(rows);
const day = '2026-11-01T09:00:00.000Z';

describe('Soma', () => {
  it('holds a recipe’s title, ingredients, notes and tags', async () => {
    const { somaSearch } = await import('../../soma/providers/search');
    const rows = await run(somaSearch, { somaRecipes: [{ id: 'r1', title: 'Lentil soup', ingredients: ['1 cup lentils', 'carrot'], notes: 'Add lemon', tags: ['soup'], createdAt: day, nutritionCanary: 'CANARY-NUTRITION' }] });
    expect(rows).toHaveLength(1);
    expect(rows[0].ref).toEqual({ app: 'soma', kind: 'recipe', id: 'r1' });
    expect(rows[0].open).toBe('/soma/');
    expect(text(rows)).toMatch(/lentils.*Add lemon.*soup/s);
    expect(text(rows)).not.toContain('CANARY');
  });
});
