import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { APPS, validateManifest, type AppManifest } from '../../core/apps';
import { enforceSearch, searchProjections, windowStart, type HostContext, type Provider, type SearchProjection } from '../../core/providers';
import { providerModules } from '../../app/providers/registry';
import { providerEnabled } from '../../app/providers/context';
import { withCache } from '../../app/providers/cache';
import { HYDROS_WINDOW_DAYS, hydrosSearch } from '../../hydros/providers/search';
import { oikonomiaSearch } from '../../oikonomia/providers/search';
import { syncedSetting } from '../../data/sync/deviceRecords';
import { syncCollections } from '../../data/sync/types';

const TODAY = '2026-11-05';
const app = (id: string) => APPS.find((each) => each.id === id) as AppManifest;

const context = (records: Record<string, unknown[]>, extra: Partial<HostContext> = {}): HostContext => ({
  today: TODAY,
  now: new Date(`${TODAY}T12:00:00`),
  records: async <T,>(source: string) => (records[source] ?? []) as T[],
  setting: () => null,
  isUsable: () => true,
  enabled: () => true,
  ...extra,
});

const bill = (extra: Record<string, unknown> = {}) => ({
  id: 'b1', name: 'Internet', amountCents: 98765432, currency: 'USD', dueDate: '2026-11-10', frequency: 'monthly', category: 'CANARY-CATEGORY',
  autopay: false, reminderDays: 3, notes: 'CANARY-NOTE account 1234-5678', payments: [{ id: 'p', date: '2026-10-10', amountCents: 55555 }], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...extra,
});

describe('the manifest and the registered providers agree', () => {
  it('lists search for exactly the apps that have a provider module', () => {
    const declared = APPS.filter((each) => each.provides?.includes('search')).map((each) => each.id).sort();
    expect(Object.keys(providerModules).sort()).toEqual(declared);
    expect(declared).toEqual(['hydros', 'oikonomia', 'soma', 'theoria']);
  });
  it('every provider belongs to its manifest app, has a class the manifest allows and reads only what syncs', async () => {
    for (const [id, load] of Object.entries(providerModules)) {
      for (const provider of (await load!()).providers) {
        expect(provider.app).toBe(id);
        expect(app(id).provides).toContain(provider.capability);
        expect(provider.privacy).toBe(app(id).search?.privacy);
        for (const source of provider.sources) {
          if (source.startsWith('setting:')) expect(syncedSetting(source.slice(8)), source).toBe(true);
          else expect(syncCollections as readonly string[], source).toContain(source);
        }
      }
    }
  });
  it('the manifest has no errors and rejects a field that is both indexed and excluded', () => {
    expect(validateManifest().errors).toEqual([]);
    const both = APPS.map((each) => (each.id === 'oikonomia' && each.search ? { ...each, search: { ...each.search, excludes: [...each.search.excludes, 'bill name'] } } : each));
    expect(validateManifest(both).errors.join('\n')).toMatch(/both indexed and excluded/);
    const unclassified = APPS.map((each) => (each.id === 'oikonomia' ? { ...each, search: undefined } : each));
    expect(validateManifest(unclassified).errors.join('\n')).toMatch(/classify its search fields/);
  });
  it('classifies the other apps as decided: what is excluded stays out of the allowed fields', () => {
    expect(app('therapeia').search?.excludes).toEqual(expect.arrayContaining(['medication doses', 'medicine notes']));
    expect(app('ktema').search?.excludes).toContain('serial numbers');
    expect(app('poreia').search?.excludes).toContain('confirmation codes');
    expect(app('philia').search?.indexes).toEqual(expect.arrayContaining(['remember lines', 'gift ideas']));
    expect(app('ergon').search?.indexes).toEqual(['chore name', 'room']);
    for (const each of APPS.filter((one) => one.search)) expect(each.search?.privacy, each.id).toBe('own-search');
  });
});

describe('Oikonomia in search', () => {
  it('holds only the bill name, due date and paid status, whatever the record contains', async () => {
    const out = await searchProjections([oikonomiaSearch], APPS, context({ oikonomiaBills: [bill()] }));
    expect(out.rejected).toEqual([]);
    expect(out.results).toHaveLength(1);
    const [row] = out.results;
    expect(row.title).toBe('Internet');
    expect(row.fields.map((field) => field.name).sort()).toEqual(['due date', 'paid status']);
    expect(row.open).toBe('/oikonomia/?open=bill%3Ab1');
    expect(JSON.stringify(out)).not.toMatch(/CANARY|98765432|987654|55555|1234-5678|USD|monthly|autopay/i);
  });
  it('says Paid for a paid bill and Not paid otherwise', async () => {
    const paid = bill({ id: 'b2', name: 'Rent', dueDate: '2026-11-20', payments: [{ id: 'x', date: '2026-11-20', amountCents: 1 }] });
    const rows = (await searchProjections([oikonomiaSearch], APPS, context({ oikonomiaBills: [bill(), paid] }))).results;
    const status = (name: string) => rows.find((row) => row.title === name)?.fields.find((field) => field.name === 'paid status')?.text;
    expect(status('Internet')).toBe('Not paid');
    expect(status('Rent')).toBe('Paid');
  });
});

describe('Hydros in search', () => {
  const drink = (id: string, daysAgo: number, extra: Record<string, unknown> = {}) => {
    const at = new Date(`${TODAY}T07:43:00`);
    at.setDate(at.getDate() - daysAgo);
    return { id, kind: 'tea', label: 'Hibiscus tea', amountOz: 12, caffeineMg: 31337, sugarG: 4242, loggedAt: at.toISOString(), createdAt: at.toISOString(), ...extra };
  };
  it('is off until the person turns it on, and Oikonomia is on', () => {
    expect(providerEnabled('hydros', 'search', { on: [], off: [] })).toBe(false);
    expect(providerEnabled('hydros', 'search', { on: ['hydros:search'], off: [] })).toBe(true);
    expect(providerEnabled('hydros', 'search', { on: ['hydros:search'], off: ['hydros:search'] })).toBe(true);
    expect(providerEnabled('hydros', 'search', { on: [], off: ['hydros:search'] })).toBe(false);
    expect(providerEnabled('oikonomia', 'search', { on: [], off: [] })).toBe(true);
    expect(providerEnabled('oikonomia', 'search', { on: [], off: ['oikonomia:search'] })).toBe(false);
  });
  it('its window in the manifest is the 30 days its provider uses', () => {
    expect(app('hydros').search?.windowDays).toBe(HYDROS_WINDOW_DAYS);
    expect(HYDROS_WINDOW_DAYS).toBe(30);
    expect(windowStart(TODAY, 30)).toBe('2026-10-07');
  });
  it('keeps the 30th day and drops the 31st', async () => {
    const records = { hydrosDrinks: [drink('in', 29), drink('out', 30), drink('old', 90), drink('now', 0)] };
    const out = await searchProjections([hydrosSearch], APPS, context(records));
    const days = out.results.filter((row) => row.ref.kind === 'day').map((row) => row.ref.id).sort();
    expect(days).toEqual(['2026-10-07', '2026-11-05']);
    expect(out.rejected).toEqual([]);
  });
  it('holds named drinks and day summaries only, with no times, caffeine, sugar or amounts per drink', async () => {
    const out = await searchProjections([hydrosSearch], APPS, context({ hydrosDrinks: [drink('a', 1), drink('b', 1, { kind: 'water', label: undefined, amountOz: 20 })] }));
    const kinds = new Set(out.results.map((row) => row.ref.kind));
    expect([...kinds].sort()).toEqual(['day', 'drink-name']);
    const text = JSON.stringify(out.results);
    expect(text).toContain('Hibiscus tea');
    expect(text).not.toMatch(/31337|4242|07:43|caffeine|sugar|electrolyte/i);
    expect(out.results.every((row) => row.fields.every((field) => field.name === 'day summaries'))).toBe(true);
  });
  it('the host enforces the window even when a provider returns older rows', async () => {
    const stray: Provider<'search'> = { ...hydrosSearch, read: () => [{ ref: { app: 'hydros', kind: 'day', id: '2026-09-01' }, title: 'Old', titleField: 'day summaries', fields: [], at: '2026-09-01', label: 'Day in Hydros', open: '/hydros/' }] };
    expect((await searchProjections([stray], APPS, context({}))).results).toEqual([]);
  });
});

describe('the host', () => {
  const row = (extra: Partial<SearchProjection> = {}): SearchProjection => ({ ref: { app: 'oikonomia', kind: 'bill', id: 'x' }, title: 'Bill', titleField: 'bill name', fields: [], at: TODAY, label: 'Bill in Oikonomia', open: '/oikonomia/', ...extra });
  const provider = (output: SearchProjection[], extra: Partial<Provider<'search'>> = {}): Provider<'search'> => ({ ...oikonomiaSearch, read: () => output, ...extra });

  it('rejects fields the manifest does not allow, named or unknown', async () => {
    const out = await searchProjections([provider([row({ fields: [{ name: 'due date', text: 'Nov 10' }, { name: 'notes', text: 'x' }, { name: 'bill amounts', text: '9' }, { name: 'invented', text: 'y' }] })])], APPS, context({}));
    expect(out.results[0].fields.map((field) => field.name)).toEqual(['due date']);
    expect(out.rejected.map((rejection) => rejection.reason)).toEqual(['field "notes" is not allowed', 'field "bill amounts" is not allowed', 'field "invented" is not allowed']);
  });
  it('drops a row whose title field is not allowed, belongs to another app, or repeats', async () => {
    const out = await searchProjections([provider([row({ titleField: 'amounts' }), row({ ref: { app: 'soma', kind: 'bill', id: 'x' } }), row(), row()])], APPS, context({}));
    expect(out.results).toHaveLength(1);
    expect(out.rejected).toHaveLength(3);
  });
  it('never takes private or shared output into universal search', async () => {
    for (const privacy of ['private', 'shared'] as const) {
      const out = await searchProjections([provider([row()], { privacy })], APPS, context({}));
      expect(out.results).toEqual([]);
      expect(out.rejected[0].reason).toMatch(/not available to universal search/);
    }
  });
  it('refuses an app the manifest does not list for search, or a retired one', async () => {
    const other = provider([row({ ref: { app: 'soma', kind: 'x', id: '1' } })], { app: 'soma' });
    expect((await searchProjections([other], APPS, context({}))).results).toEqual([]);
    const praxis = provider([], { app: 'praxis' });
    expect((await searchProjections([praxis], APPS, context({}))).rejected[0].reason).toMatch(/retired/);
  });
  it('does not run a provider for an app that is not added or has search off', async () => {
    let called = 0;
    const counting = provider([row()], { read: () => { called += 1; return [row()]; } });
    await searchProjections([counting], APPS, context({}, { isUsable: () => false }));
    await searchProjections([counting], APPS, context({}, { enabled: () => false }));
    expect(called).toBe(0);
    expect((await searchProjections([counting], APPS, context({}))).results).toHaveLength(1);
    expect(called).toBe(1);
  });
  it('measures each provider that ran, and times nothing for one that did not', async () => {
    const ran = await searchProjections([oikonomiaSearch], APPS, context({ oikonomiaBills: [bill()] }));
    expect(ran.timings).toHaveLength(1);
    expect(ran.timings[0]).toMatchObject({ app: 'oikonomia', rows: 1 });
    expect(ran.timings[0].ms).toBeGreaterThanOrEqual(0);
    const skipped = await searchProjections([oikonomiaSearch], APPS, context({}, { enabled: () => false }));
    expect(skipped.timings).toEqual([]);
  });
  it('reports a provider that throws and carries on with the rest', async () => {
    const broken = provider([], { read: () => { throw new Error('boom'); } });
    const out = await searchProjections([broken, provider([row()])], APPS, context({}));
    expect(out.results).toHaveLength(1);
    expect(out.rejected[0].reason).toMatch(/boom/);
  });
  it('enforceSearch keeps references to stable keys', () => {
    const { kept } = enforceSearch(app('oikonomia'), [row()], TODAY);
    expect(kept[0].ref).toEqual({ app: 'oikonomia', kind: 'bill', id: 'x' });
  });
});

describe('providers are pure and caches are dropped by changes', () => {
  it('writes nothing and calls no network while reading', async () => {
    const writes: string[] = [];
    const guard = new Proxy({}, { get: (_target, name) => () => { writes.push(String(name)); } });
    const realFetch = globalThis.fetch;
    globalThis.fetch = (() => { writes.push('fetch'); throw new Error('network'); }) as unknown as typeof fetch;
    const ctx = { ...context({ oikonomiaBills: [bill()], hydrosDrinks: [] }), setting: (key: string) => { void guard; return key ? null : null; } };
    await oikonomiaSearch.read(ctx);
    await hydrosSearch.read(ctx);
    globalThis.fetch = realFetch;
    expect(writes).toEqual([]);
  });
  it('a cached result is reused until a sync changes a collection it reads', async () => {
    let reads = 0;
    const listeners = new Set<(collections: readonly string[]) => void>();
    const emit = (collections: readonly string[]) => listeners.forEach((listener) => listener(collections));
    const base: Provider<'search'> = { ...oikonomiaSearch, read: () => { reads += 1; return []; } };
    const cached = withCache(base, (listener) => { listeners.add(listener); return () => listeners.delete(listener); });
    const ctx = context({});
    await cached.read(ctx);
    await cached.read(ctx);
    expect(reads).toBe(1);
    emit(['somaRecipes']);
    await cached.read(ctx);
    expect(reads).toBe(1);
    emit(['oikonomiaBills']);
    await cached.read(ctx);
    expect(reads).toBe(2);
    emit(['*']);
    await cached.read(ctx);
    expect(reads).toBe(3);
    await cached.read({ ...ctx, today: '2026-11-06' });
    expect(reads).toBe(4);
  });
});
