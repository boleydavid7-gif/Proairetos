// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { APPS, type AppManifest } from '../../core/apps';
import { createLifeRecord, type LifeRecord } from '../../core/life-records';
import { enforceLibrary, libraryRecords, mayProvideLibrary, visibleInLibrary, type HostContext, type Provider } from '../../core/providers';

/* The Library contract: what may reach the Library, who may put entries there, which entries are shown. No app provides yet. */
const range = { from: new Date('2026-11-01T00:00:00'), until: new Date('2026-12-01T00:00:00') };
const classify = (...ids: string[]): AppManifest[] =>
  APPS.map((app) => (ids.includes(app.id) ? { ...app, provides: [...(app.provides ?? []), 'library' as const], library: { kinds: ['workout', 'meal'], shows: ['a title and a date'], detailsOnly: ['words'], excludes: ['heart rate'] } } : app));
const manifest = classify('askesis', 'dynamis', 'soma');
const app = (id: string) => manifest.find((each) => each.id === id) as AppManifest;

const entry = (id: string, extra: Partial<LifeRecord> = {}): LifeRecord =>
  createLifeRecord({ key: `workout:${id}`, kind: 'workout', sourceApp: 'askesis', source: 'Askesis', sourceId: id, at: '2026-10-14T07:10:00.000Z', title: 'Easy run', detail: '3.2 mi', valueIds: [], archived: false, ...extra });
const provider = (read: () => LifeRecord[], extra: Partial<Provider<'library'>> = {}): Provider<'library'> => ({ app: 'askesis', capability: 'library', version: 1, privacy: 'own-search', sources: ['askesisWorkouts'], read, ...extra });
const ctx = (extra: Partial<HostContext> = {}): HostContext => ({ today: '2026-11-05', now: new Date('2026-11-05T12:00:00'), range, records: async () => [], setting: () => null, isUsable: () => true, enabled: () => true, ...extra });

describe('what may reach the Library', () => {
  it('keeps an entry that is the app’s own, of a listed kind, with a key that holds its source id', () => {
    const out = enforceLibrary(app('askesis'), [entry('a1'), entry('a2', { archived: true })]);
    expect(out.rejected).toEqual([]);
    expect(out.kept.map((record) => record.key)).toEqual(['workout:a1', 'workout:a2']);
  });
  it('leaves an entry exactly as the app gave it: its owner, kind and fields are not changed', () => {
    const given = entry('a1');
    const frozen = JSON.stringify(given);
    const [kept] = enforceLibrary(app('askesis'), [Object.freeze(given)]).kept;
    expect(kept).toBe(given);
    expect(JSON.stringify(kept)).toBe(frozen);
  });
  it('rejects an entry that carries more than an entry: a booking code, heart rate, a note field', () => {
    const rich = { ...entry('a1'), confirmation: 'CANARY', avgHr: 151 } as unknown as LifeRecord;
    const out = enforceLibrary(app('askesis'), [rich]);
    expect(out.kept).toEqual([]);
    expect(out.rejected[0].reason).toMatch(/confirmation, avgHr/);
  });
  it('rejects another app’s entry, a wrong source label and a kind the manifest does not list', () => {
    const out = enforceLibrary(app('askesis'), [entry('a1', { sourceApp: 'dynamis', source: 'Dynamis' }), entry('a2', { source: 'Dynamis' }), entry('a3', { kind: 'trip' }), entry('a4', { sourceApp: 'compass', source: 'Compass' })]);
    expect(out.kept).toEqual([]);
    expect(out.rejected).toHaveLength(4);
  });
  it('rejects a key that does not hold the source id, an empty source id, a bad time and empty or non-text words', () => {
    const out = enforceLibrary(app('askesis'), [
      entry('a1', { key: 'workout:other' }),
      entry('a2', { sourceId: '' }),
      entry('a3', { at: 'yesterday' }),
      entry('a4', { title: '  ' }),
      { ...entry('a5'), body: 5 } as unknown as LifeRecord,
      { ...entry('a6'), valueIds: [1] } as unknown as LifeRecord,
      { ...entry('a7'), archived: 'no' } as unknown as LifeRecord,
    ]);
    expect(out.kept).toEqual([]);
    expect(out.rejected).toHaveLength(7);
  });
  it('rejects the same key twice', () => {
    const out = enforceLibrary(app('askesis'), [entry('a1'), entry('a1', { title: 'Again' })]);
    expect(out.kept).toHaveLength(1);
    expect(out.rejected[0].reason).toMatch(/twice/);
  });
});

describe('who may put entries in the Library', () => {
  it('needs the manifest to list library and classify its entries, and a named app', () => {
    expect(mayProvideLibrary(undefined, provider(() => []))?.reason).toMatch(/manifest/);
    expect(mayProvideLibrary(APPS.find((each) => each.id === 'hydros'), provider(() => [], { app: 'hydros' }))?.reason).toMatch(/does not list library/);
    const unclassified = { ...app('askesis'), library: undefined };
    expect(mayProvideLibrary(unclassified, provider(() => []))?.reason).toMatch(/not classified/);
    const notNamed = { ...app('hydros'), provides: ['library' as const], library: { kinds: ['note'], shows: ['x'], detailsOnly: ['z'], excludes: ['y'] } };
    expect(mayProvideLibrary(notNamed, provider(() => [], { app: 'hydros' }))?.reason).toMatch(/not one of the apps the Library names/);
    expect(mayProvideLibrary(app('askesis'), provider(() => []))).toBeNull();
  });
  it('refuses private and shared classes, and a retired app', () => {
    expect(mayProvideLibrary(app('askesis'), provider(() => [], { privacy: 'private' }))?.reason).toMatch(/class private/);
    expect(mayProvideLibrary(app('askesis'), provider(() => [], { privacy: 'shared' }))?.reason).toMatch(/class shared/);
    expect(mayProvideLibrary({ ...app('askesis'), status: 'retired' }, provider(() => []))?.reason).toMatch(/retired/);
  });
  it('classifies the Library of every app that declares it, and only those', () => {
    const declared = APPS.filter((each) => each.provides?.includes('library')).map((each) => each.id).sort();
    expect(APPS.filter((each) => each.library).map((each) => each.id).sort()).toEqual(declared);
  });
});

describe('the host', () => {
  it('asks only an app that is added and usable, and whose Library capability is not switched off', async () => {
    let asked = 0;
    const counting = provider(() => (asked += 1, [entry('a1')]));
    expect((await libraryRecords([counting], manifest, ctx())).records).toHaveLength(1);
    expect((await libraryRecords([counting], manifest, ctx({ isUsable: () => false }))).records).toEqual([]);
    expect((await libraryRecords([counting], manifest, ctx({ enabled: () => false }))).records).toEqual([]);
    expect(asked).toBe(1);
  });
  it('reports a provider that cannot read and goes on with the others', async () => {
    const broken = provider(() => { throw new Error('no store'); });
    const soma = provider(() => [entry('r1', { key: 'meal:r1@2026-10-10', kind: 'meal', sourceApp: 'soma', source: 'Soma' })], { app: 'soma' });
    const out = await libraryRecords([broken, soma], manifest, ctx());
    expect(out.records.map((record) => record.key)).toEqual(['meal:r1@2026-10-10']);
    expect(out.rejected[0].reason).toMatch(/could not read: no store/);
  });
  it('shows an entry once across apps', async () => {
    const same = entry('x1', { key: 'workout:x1', sourceApp: 'dynamis', source: 'Dynamis' });
    const out = await libraryRecords([provider(() => [entry('x1')]), provider(() => [same], { app: 'dynamis' })], manifest, ctx());
    expect(out.records).toHaveLength(1);
    expect(out.rejected.some((each) => /another app already used/.test(each.reason))).toBe(true);
  });
  it('derives in memory only: it writes nothing to browser storage, and a second call gives the same entries', async () => {
    localStorage.setItem('keep', 'this');
    const before = JSON.stringify(Object.entries(localStorage));
    const p = provider(() => [entry('a1'), entry('a2')]);
    const first = await libraryRecords([p], manifest, ctx());
    const second = await libraryRecords([p], manifest, ctx());
    expect(JSON.stringify(Object.entries(localStorage))).toBe(before);
    expect(second.records).toEqual(first.records);
    localStorage.clear();
  });
});

describe('entries whose originating app is not available', () => {
  const own = entry('rf1', { key: 'reflection:rf1', kind: 'reflection', sourceApp: 'proairetos', source: 'Proairetos', sourceId: 'rf1' });
  const afterRun = entry('rf2', { key: 'reflection:rf2', kind: 'reflection', sourceApp: 'askesis', source: 'Askesis', sourceId: 'rf2' });
  const decision = entry('d1', { key: 'decision:d1', kind: 'decision', sourceApp: 'compass', source: 'Compass', sourceId: 'd1' });
  const run = entry('a1');
  const all = [own, afterRun, decision, run];
  it('are hidden, with their own reflections and Compass entries always shown', () => {
    expect(visibleInLibrary(all, () => false).map((record) => record.key)).toEqual(['reflection:rf1', 'decision:d1']);
    expect(visibleInLibrary(all, (app) => app === 'askesis').map((record) => record.key)).toEqual(['reflection:rf1', 'reflection:rf2', 'decision:d1', 'workout:a1']);
  });
  it('are only hidden: nothing is changed, deleted or copied, and they return when the app does', () => {
    const frozen = JSON.stringify(all);
    all.forEach((record) => Object.freeze(record));
    const hidden = visibleInLibrary(all, () => false);
    expect(JSON.stringify(all)).toBe(frozen);
    expect(hidden.every((record) => all.includes(record))).toBe(true);
    expect(visibleInLibrary(all, () => true)).toEqual(all);
  });
});
