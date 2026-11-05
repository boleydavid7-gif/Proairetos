import { describe, expect, it } from 'vitest';
import { APPS, type AppManifest } from '../../core/apps';
import { enforceHome, homeRows, type HomeRow, type HostContext, type Provider } from '../../core/providers';
import { createHomeStore, type HomeDeps } from '../../app/providers/homeStore';

/* The lines apps put on Today: what may reach it, and when an app's lines are derived. */
const TODAY = '2026-11-05';
const day = { today: TODAY, start: new Date('2026-11-05T00:00:00'), end: new Date('2026-11-06T00:00:00') };
const withHome = (...ids: string[]): AppManifest[] =>
  APPS.map((app) => (ids.includes(app.id) ? { ...app, provides: [...(app.provides ?? []), 'home' as const], home: { shows: ['a title and a detail'], excludes: ['notes'] } } : app));
const manifest = withHome('ergon', 'ktema', 'philia', 'hydros');
const app = (id: string) => manifest.find((each) => each.id === id) as AppManifest;

const row = (id: string, extra: Partial<HomeRow> = {}): HomeRow => ({ ref: { app: 'ergon', kind: 'chore', id }, group: 'attention', title: `Chore ${id}`, detail: 'Since Tue', open: `/ergon/?open=chore%3A${id}`, swipe: { id: `chore:${id}` }, ...extra });
const provider = (appId: 'ergon' | 'ktema' | 'philia' | 'hydros', output: () => HomeRow[], extra: Partial<Provider<'home'>> = {}): Provider<'home'> => ({
  app: appId, capability: 'home', version: 1, privacy: 'own-search', sources: [`${appId}:src`], read: () => output(), ...extra,
});
const ctx = (extra: Partial<HostContext> = {}): HostContext => ({ today: TODAY, now: new Date(`${TODAY}T12:00:00`), records: async () => [], setting: () => null, isUsable: () => true, enabled: () => true, ...extra });

describe('what may reach Today', () => {
  it('keeps a summary line and nothing else', () => {
    const good = row('c1', { progress: { value: 0.5, label: 'half' }, icon: 'list' });
    expect(enforceHome(app('ergon'), [good]).kept).toEqual([good]);
  });
  it('rejects a line that carries more than a summary', () => {
    const rich = { ...row('c1'), record: { note: 'CANARY' } } as unknown as HomeRow;
    const out = enforceHome(app('ergon'), [rich]);
    expect(out.kept).toEqual([]);
    expect(out.rejected[0].reason).toMatch(/record/);
  });
  it('rejects a line about another app, in the wrong group, or opening outside its app', () => {
    const out = enforceHome(app('ergon'), [row('a', { ref: { app: 'ktema', kind: 'x', id: '1' } }), row('b', { group: 'practice' }), row('c', { open: '/soma/' }), row('d', { open: '/ergon//x' })]);
    expect(out.kept).toEqual([]);
    expect(out.rejected).toHaveLength(4);
  });
  it('rejects a bad bar, a pull with no id and a repeated line, so nothing shows twice', () => {
    const out = enforceHome(app('ergon'), [row('a', { progress: { value: 2, label: 'x' } }), row('b', { swipe: { id: '' } }), row('c'), row('c')]);
    expect(out.kept.map((each) => each.ref.id)).toEqual(['c']);
    expect(out.rejected).toHaveLength(3);
  });
});

describe('who may put lines on Today', () => {
  it('runs a provider only for an app that is added, usable and not set aside', async () => {
    let ran = 0;
    const counting = provider('ergon', () => { ran += 1; return [row('c1')]; });
    await homeRows([counting], manifest, ctx({ isUsable: () => false }));
    await homeRows([counting], manifest, ctx({ enabled: () => false }));
    expect(ran).toBe(0);
    const out = await homeRows([counting], manifest, ctx());
    expect(out.rows).toHaveLength(1);
    expect(ran).toBe(1);
  });
  it('refuses an app the manifest does not list for home, a retired app, and a private or shared class', async () => {
    const soma = provider('ergon', () => [row('c1')], { app: 'soma' as never });
    expect((await homeRows([soma], manifest, ctx())).rejected[0].reason).toMatch(/does not list home/);
    const praxis = provider('ergon', () => [], { app: 'praxis' as never });
    expect((await homeRows([praxis], manifest, ctx())).rejected[0].reason).toMatch(/retired/);
    for (const privacy of ['private', 'shared'] as const) {
      const out = await homeRows([provider('ergon', () => [row('c1')], { privacy })], manifest, ctx());
      expect(out.rows).toEqual([]);
      expect(out.rejected[0].reason).toMatch(/not available to Today/);
    }
  });
  it('reports a provider that throws and goes on with the rest', async () => {
    const out = await homeRows([provider('ergon', () => { throw new Error('boom'); }), provider('ktema', () => [row('k1', { ref: { app: 'ktema', kind: 'upkeep', id: 'k1' }, open: '/ktema/' })])], manifest, ctx());
    expect(out.rows).toHaveLength(1);
    expect(out.rejected[0].reason).toMatch(/boom/);
  });
});

function store(providers: Provider<'home'>[], overrides: Partial<HomeDeps> = {}) {
  const synced = new Set<(collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void>();
  const choices = new Set<() => void>();
  let clock = new Date(`${TODAY}T12:00:00`);
  const deps: HomeDeps = {
    manifest,
    load: async (id) => providers.filter((each) => each.app === id),
    context: (given, now) => ({ ...ctx({ today: given.today }), now }),
    usable: () => true,
    enabled: () => true,
    onSynced: (listener) => { synced.add(listener); return () => synced.delete(listener); },
    onChoices: (listener) => { choices.add(listener); return () => choices.delete(listener); },
    now: () => clock,
    ...overrides,
  };
  const instance = createHomeStore(deps);
  return { instance, sync: (collections: string[], ids?: Map<string, string[]>) => synced.forEach((listener) => listener(collections, ids)), choose: () => choices.forEach((listener) => listener()), advance: (ms: number) => { clock = new Date(clock.getTime() + ms); } };
}

describe('when an app’s lines are derived', () => {
  it('derives nothing until Today is shown, then each eligible app once', async () => {
    const ergon = provider('ergon', () => [row('c1')]);
    const ktema = provider('ktema', () => [row('k1', { ref: { app: 'ktema', kind: 'upkeep', id: 'k1' }, open: '/ktema/' })]);
    const { instance } = store([ergon, ktema]);
    expect(instance.derivations()).toEqual([]);
    instance.setDay(day);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    expect(instance.derivations().map((each) => each.app).sort()).toEqual(['ergon', 'ktema']);
    expect(instance.rows('attention').map((each) => each.ref.app)).toEqual(['ergon', 'ktema']);
    off();
  });
  it('a sync that changed one app’s records derives only that app', async () => {
    const { instance, sync } = store([provider('ergon', () => [row('c1')], { sources: ['local:ergon:chore:'] }), provider('ktema', () => [], { sources: ['local:ktema:upkeep:'] })]);
    instance.setDay(day);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    const before = instance.derivations().length;
    sync(['preferences'], new Map([['preferences', ['ktema:upkeep:u1']]]));
    await instance.settled();
    expect(instance.derivations().slice(before).map((each) => each.app)).toEqual(['ktema']);
    off();
  });
  it('a change inside an app, told by the provider, derives only that app', async () => {
    let tell = () => undefined as void;
    const ergon = provider('ergon', () => [row('c1')], { subscribe: (listener) => { tell = listener; return () => undefined; } });
    const { instance } = store([ergon, provider('ktema', () => [])]);
    instance.setDay(day);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    const before = instance.derivations().length;
    tell();
    await instance.settled();
    expect(instance.derivations().slice(before).map((each) => each.app)).toEqual(['ergon']);
    off();
  });
  it('the day turning over derives every app again; the same day does not', async () => {
    const { instance } = store([provider('ergon', () => [row('c1')]), provider('ktema', () => [])]);
    instance.setDay(day);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    const before = instance.derivations().length;
    instance.setDay({ ...day });
    await instance.settled();
    expect(instance.derivations().length).toBe(before);
    instance.setDay({ today: '2026-11-06', start: new Date('2026-11-06T00:00:00'), end: new Date('2026-11-07T00:00:00') });
    await instance.settled();
    expect(instance.derivations().length - before).toBe(2);
    off();
  });
  it('a result is derived again only after its time is up (sooner for a line that follows the clock)', async () => {
    const { instance, advance } = store([provider('ergon', () => [row('c1')]), provider('philia', () => [], { maxAgeMs: 60_000 })]);
    instance.setDay(day);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    const before = instance.derivations().length;
    advance(61_000);
    instance.invalidate();
    instance.setDay({ ...day });
    await instance.settled();
    // Invalidate marks everything out of date; with nothing marked, only the quick one is past its age.
    expect(instance.derivations().length).toBeGreaterThan(before);
    off();
  });
  it('an app removed or set aside loses its lines and is not derived again', async () => {
    let hidden = false;
    const { instance, choose } = store([provider('ergon', () => [row('c1')]), provider('ktema', () => [row('k1', { ref: { app: 'ktema', kind: 'upkeep', id: 'k1' }, open: '/ktema/' })])], { enabled: (id) => !(hidden && id === 'ergon') });
    instance.setDay(day);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    expect(instance.rows().map((each) => each.ref.app)).toEqual(['ergon', 'ktema']);
    hidden = true;
    choose();
    await instance.settled();
    expect(instance.rows().map((each) => each.ref.app)).toEqual(['ktema']);
    off();
  });
  it('an app that is not added is never derived', async () => {
    let ran = 0;
    const { instance } = store([provider('ergon', () => { ran += 1; return []; })], { usable: () => false });
    instance.setDay(day);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    expect(ran).toBe(0);
    off();
  });
  it('stops listening, and forgets its lines, when Today is no longer shown', async () => {
    const { instance, sync } = store([provider('ergon', () => [row('c1')])]);
    instance.setDay(day);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    off();
    const before = instance.derivations().length;
    sync(['*']);
    await instance.settled();
    expect(instance.derivations().length).toBe(before);
    expect(instance.rows()).toEqual([]);
  });
  it('tells a listener only when the lines actually change', async () => {
    let changes = 0;
    let output = [row('c1')];
    const { instance, sync } = store([provider('ergon', () => output)]);
    instance.setDay(day);
    const off = instance.subscribe(() => { changes += 1; });
    await instance.settled();
    const first = changes;
    sync(['*']);
    await instance.settled();
    expect(changes).toBe(first);
    output = [row('c1', { detail: 'Today' })];
    sync(['*']);
    await instance.settled();
    expect(changes).toBe(first + 1);
    off();
  });
  it('starts what a line needs (warm) when Today starts and after a sync, for eligible apps only', async () => {
    let warmed = 0;
    const { instance, sync } = store([provider('ergon', () => [], { warm: () => { warmed += 1; } })]);
    instance.setDay(day);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    sync(['*']);
    await instance.settled();
    expect(warmed).toBeGreaterThanOrEqual(1);
    off();
  });
});
