import { describe, expect, it } from 'vitest';
import { APPS, type AppManifest } from '../../core/apps';
import { calendarLines, enforceCalendar, type CalendarLine, type HostContext, type Provider } from '../../core/providers';

import { createCalendarStore, type CalendarDeps } from '../../app/providers/calendarStore';
/* The lines apps put on the calendar: what may reach it, and who may put lines there. */
const TODAY = '2026-11-05';
const range = { from: new Date('2026-11-01T00:00:00'), until: new Date('2026-12-01T00:00:00') };
const withCalendar = (...ids: string[]): AppManifest[] =>
  APPS.map((app) => (ids.includes(app.id) ? { ...app, provides: [...(app.provides ?? []), 'calendar' as const], calendar: { shows: ['a title and a day'], excludes: ['notes'], kinds: ['event', 'deadline', 'recurring', 'info'] as const } } : app));
const manifest = withCalendar('ergon', 'ktema', 'philia');
const app = (id: string) => manifest.find((each) => each.id === id) as AppManifest;

const line = (id: string, extra: Partial<CalendarLine> = {}): CalendarLine => ({ ref: { app: 'ergon', kind: 'chore', id }, kind: 'deadline', title: `Chore ${id}`, open: `/ergon/?open=chore%3A${id}`, day: '2026-11-06', ...extra });
const timed = (id: string, start: string, end: string, extra: Partial<CalendarLine> = {}) => line(id, { kind: 'event', day: start.slice(0, 10), start: new Date(start), end: new Date(end), ...extra });
const provider = (output: () => CalendarLine[], extra: Partial<Provider<'calendar'>> = {}): Provider<'calendar'> => ({ app: 'ergon', capability: 'calendar', version: 1, privacy: 'own-search', sources: ['ergon:src'], read: () => output(), ...extra });
const ctx = (extra: Partial<HostContext> = {}): HostContext => ({ today: TODAY, now: new Date(`${TODAY}T12:00:00`), records: async () => [], setting: () => null, isUsable: () => true, enabled: () => true, range, ...extra });

describe('what may reach the calendar', () => {
  it('keeps a line of each kind, with its day, span or time', () => {
    const lines = [line('a'), timed('b', '2026-11-07T09:00:00', '2026-11-07T10:00:00'), line('c', { kind: 'info', day: '2026-11-07', until: '2026-11-10' }), line('d', { kind: 'recurring', ref: { app: 'ergon', kind: 'chore', id: 'd', occurrence: '2026-11-08' }, day: '2026-11-08' })];
    const out = enforceCalendar(app('ergon'), lines, range);
    expect(out.rejected).toEqual([]);
    expect(out.kept).toHaveLength(4);
  });
  it('rejects a line that carries more than a calendar line, such as a note or an amount', () => {
    const rich = { ...line('a'), notes: 'CANARY', amount: '$50' } as unknown as CalendarLine;
    const out = enforceCalendar(app('ergon'), [rich]);
    expect(out.kept).toEqual([]);
    expect(out.rejected[0].reason).toMatch(/notes, amount/);
  });
  it('rejects a line about another app, a kind the manifest does not list and an address outside the app', () => {
    const narrow = withCalendar('ergon').map((each) => (each.id === 'ergon' ? { ...each, calendar: { shows: ['x'], excludes: ['y'], kinds: ['deadline'] as const } } : each)).find((each) => each.id === 'ergon') as AppManifest;
    const out = enforceCalendar(narrow, [line('a', { ref: { app: 'ktema', kind: 'x', id: '1' } }), timed('b', '2026-11-07T09:00:00', '2026-11-07T10:00:00'), line('c', { open: '/soma/' }), line('d', { open: '/ergon//x' })]);
    expect(out.kept).toEqual([]);
    expect(out.rejected).toHaveLength(4);
  });
  it('rejects a day that is not a day, a span that ends before it starts, and a time on a deadline', () => {
    const out = enforceCalendar(app('ergon'), [line('a', { day: 'Nov 6' }), line('b', { until: '2026-11-06' }), line('c', { until: '2026-11-05' }), line('d', { start: new Date('2026-11-06T09:00:00') })]);
    expect(out.kept).toEqual([]);
    expect(out.rejected).toHaveLength(4);
  });
  it('rejects an event with no time, an end before its start, or a day that is not the day it starts', () => {
    const out = enforceCalendar(app('ergon'), [line('a', { kind: 'event' }), timed('b', '2026-11-07T10:00:00', '2026-11-07T09:00:00'), timed('c', '2026-11-07T10:00:00', '2026-11-07T11:00:00', { day: '2026-11-08' })]);
    expect(out.kept).toEqual([]);
    expect(out.rejected).toHaveLength(3);
  });
  it('shows a record once: the same ref on the same day is dropped, a repeat on another day is kept', () => {
    const repeat = (day: string) => line('a', { kind: 'recurring', ref: { app: 'ergon', kind: 'chore', id: 'a', occurrence: day }, day });
    const out = enforceCalendar(app('ergon'), [line('a'), line('a'), repeat('2026-11-08'), repeat('2026-11-09')]);
    expect(out.kept).toHaveLength(3);
    expect(out.rejected).toHaveLength(1);
  });
  it('drops a line outside the visible range, and keeps a span that reaches into it (end-exclusive)', () => {
    const out = enforceCalendar(app('ergon'), [line('before', { day: '2026-10-31' }), line('after', { day: '2026-12-01' }), line('into', { kind: 'info', day: '2026-10-28', until: '2026-11-02' }), line('endsAtStart', { kind: 'info', day: '2026-10-28', until: '2026-11-01' })], range);
    expect(out.kept.map((each) => each.ref.id)).toEqual(['into']);
    expect(out.rejected).toEqual([]);
  });
});

describe('who may put lines on the calendar', () => {
  it('runs a provider only for an app that is added, usable and has its calendar on', async () => {
    let ran = 0;
    const counting = provider(() => { ran += 1; return [line('c1')]; });
    await calendarLines([counting], manifest, ctx({ isUsable: () => false }));
    await calendarLines([counting], manifest, ctx({ enabled: () => false }));
    expect(ran).toBe(0);
    expect((await calendarLines([counting], manifest, ctx())).lines).toHaveLength(1);
    expect(ran).toBe(1);
  });
  it('refuses an app the manifest does not list for the calendar, a retired app, and a private or shared class', async () => {
    expect((await calendarLines([provider(() => [line('a')], { app: 'mneme' as never })], manifest, ctx())).rejected[0].reason).toMatch(/does not list calendar/);
    expect((await calendarLines([provider(() => [], { app: 'praxis' as never })], manifest, ctx())).rejected[0].reason).toMatch(/retired/);
    for (const privacy of ['private', 'shared'] as const) expect((await calendarLines([provider(() => [line('a')], { privacy })], manifest, ctx())).rejected[0].reason).toMatch(/not available/);
  });
  it('keeps one provider’s failure from taking the others’ lines', async () => {
    const broken = provider(() => { throw new Error('bad record'); });
    const fine = provider(() => [line('k', { ref: { app: 'ktema', kind: 'upkeep', id: 'k' }, open: '/ktema/?open=upkeep%3Ak' })], { app: 'ktema' });
    const out = await calendarLines([broken, fine], manifest, ctx());
    expect(out.lines.map((each) => each.ref.app)).toEqual(['ktema']);
    expect(out.rejected[0].reason).toMatch(/bad record/);
  });
});



function store(providers: Provider<'calendar'>[], overrides: Partial<CalendarDeps> = {}) {
  const synced = new Set<(collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void>();
  const choices = new Set<() => void>();
  let clock = new Date(`${TODAY}T12:00:00`);
  const deps: CalendarDeps = {
    manifest,
    load: async (id) => providers.filter((each) => each.app === id),
    context: (_given, now) => ({ ...ctx(), now }),
    usable: () => true,
    enabled: () => true,
    onSynced: (listener) => { synced.add(listener); return () => synced.delete(listener); },
    onChoices: (listener) => { choices.add(listener); return () => choices.delete(listener); },
    now: () => clock,
    ...overrides,
  };
  const instance = createCalendarStore(deps);
  return { instance, sync: (collections: string[], ids?: Map<string, string[]>) => synced.forEach((listener) => listener(collections, ids)), choose: () => choices.forEach((listener) => listener()), advance: (ms: number) => { clock = new Date(clock.getTime() + ms); } };
}
const ktemaLine = (id: string) => line(id, { ref: { app: 'ktema', kind: 'upkeep', id }, open: `/ktema/?open=upkeep%3A${id}` });
const nov = { from: new Date('2026-11-01T00:00:00'), until: new Date('2026-12-01T00:00:00') };
const dec = { from: new Date('2026-12-01T00:00:00'), until: new Date('2027-01-01T00:00:00') };

describe('when an app’s calendar lines are derived', () => {
  it('derives each eligible app once for a range, and uses what it holds the second time', async () => {
    const { instance } = store([provider(() => [line('c1')]), provider(() => [ktemaLine('k1')], { app: 'ktema' })]);
    expect((await instance.lines(nov)).map((each) => each.ref.app)).toEqual(['ergon', 'ktema']);
    await instance.lines(nov);
    expect(instance.derivations().map((each) => each.app).sort()).toEqual(['ergon', 'ktema']);
  });
  it('asks again for a range not yet seen, and keeps the first range', async () => {
    const { instance } = store([provider(() => [line('c1')])]);
    await instance.lines(nov);
    await instance.lines(dec);
    await instance.lines(nov);
    expect(instance.derivations()).toHaveLength(2);
  });
  it('a sync that changed one app’s records derives only that app, and tells the reader', async () => {
    const { instance, sync } = store([provider(() => [line('c1')], { sources: ['local:ergon:chore:'] }), provider(() => [], { app: 'ktema', sources: ['local:ktema:upkeep:'] })]);
    const told: number[] = [];
    const off = instance.subscribe(() => told.push(instance.version()));
    await instance.lines(nov);
    const before = instance.derivations().length;
    sync(['preferences'], new Map([['preferences', ['ktema:upkeep:u1']]]));
    expect(told).toHaveLength(1);
    await instance.lines(nov);
    expect(instance.derivations().slice(before).map((each) => each.app)).toEqual(['ktema']);
    sync(['somaRecipes']);
    expect(told).toHaveLength(1);
    off();
  });
  it('a change inside an app, told by the provider, derives only that app', async () => {
    let tell = () => undefined as void;
    const { instance } = store([provider(() => [line('c1')], { subscribe: (listener) => { tell = listener; return () => undefined; } }), provider(() => [], { app: 'ktema' })]);
    const off = instance.subscribe(() => undefined);
    await instance.lines(nov);
    const before = instance.derivations().length;
    tell();
    await instance.lines(nov);
    expect(instance.derivations().slice(before).map((each) => each.app)).toEqual(['ergon']);
    off();
  });
  it('the day turning over, or the age limit, derives again; the same day within the limit does not', async () => {
    const { instance, advance } = store([provider(() => [line('c1')])]);
    await instance.lines(nov);
    advance(60_000);
    await instance.lines(nov);
    expect(instance.derivations()).toHaveLength(1);
    advance(6 * 60_000);
    await instance.lines(nov);
    expect(instance.derivations()).toHaveLength(2);
    advance(24 * 3_600_000);
    await instance.lines(nov);
    expect(instance.derivations()).toHaveLength(3);
  });
  it('an app removed or set aside is dropped and not asked again', async () => {
    let usable = true;
    const { instance, choose } = store([provider(() => [line('c1')]), provider(() => [ktemaLine('k1')], { app: 'ktema' })], { usable: (app) => app !== 'ktema' || usable });
    const off = instance.subscribe(() => undefined);
    expect(await instance.lines(nov)).toHaveLength(2);
    usable = false;
    choose();
    const before = instance.derivations().length;
    expect((await instance.lines(nov)).map((each) => each.ref.app)).toEqual(['ergon']);
    expect(instance.derivations().length).toBe(before);
    off();
  });
  it('keeps no more than a handful of ranges for an app', async () => {
    const { instance } = store([provider(() => [])]);
    for (let month = 0; month < 9; month += 1) await instance.lines({ from: new Date(2027, month, 1), until: new Date(2027, month + 1, 1) });
    const before = instance.derivations().length;
    await instance.lines({ from: new Date(2027, 0, 1), until: new Date(2027, 1, 1) });
    expect(instance.derivations().length).toBe(before + 1);
  });
});
