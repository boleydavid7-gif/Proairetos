import { describe, expect, it } from 'vitest';
import { APPS, type AppManifest } from '../../core/apps';
import { enforceNotices, mayProvideNotices, noticeLines, type HostContext, type NoticeLine, type Provider } from '../../core/providers';

/* The notice contract: what may reach notices, who may put one there, and which switch decides. No app provides yet. */
const NOW = new Date('2026-11-05T12:00:00');
const range = { from: NOW, until: new Date('2026-11-19T12:00:00') };
const fields = { shows: ['a name'], detailsOnly: ['a time'], excludes: ['notes'] };
const classify = (...ids: string[]): AppManifest[] =>
  APPS.map((app) => (ids.includes(app.id) ? { ...app, provides: [...(app.provides ?? []), 'notices' as const], notices: { ...app.notices, fields } } : app));
const manifest = classify('ergon', 'ktema', 'philia');
const app = (id: string) => manifest.find((each) => each.id === id) as AppManifest;

const notice = (id: string, extra: Partial<NoticeLine> = {}): NoticeLine => ({ ref: { app: 'ergon', kind: 'chore', id }, kind: 'chore', key: `ergon:${id}`, at: new Date('2026-11-06T09:00:00'), title: `Chore ${id}`, body: 'Today.', open: 'ergon', ...extra });
const provider = (output: () => NoticeLine[], extra: Partial<Provider<'notices'>> = {}): Provider<'notices'> => ({ app: 'ergon', capability: 'notices', version: 1, privacy: 'own-search', sources: ['local:ergon:chore:'], read: () => output(), ...extra });
const ctx = (extra: Partial<HostContext> = {}): HostContext => ({ today: '2026-11-05', now: NOW, range, records: async () => [], setting: () => null, isUsable: () => true, enabled: () => true, noticeSwitch: () => true, ...extra });

describe('what may reach notices', () => {
  it('keeps a notice with the keys of a notice, a real time in range, a kind the app lists and a way in inside the app', () => {
    const out = enforceNotices(app('ergon'), [notice('a'), notice('b', { open: 'ergon:today' }), notice('c', { open: 'ergon:chore:c' })], range);
    expect(out.rejected).toEqual([]);
    expect(out.kept).toHaveLength(3);
  });
  it('rejects a notice that carries a note, an amount, a code or anything else a notice may not carry', () => {
    const rich = { ...notice('a'), note: 'CANARY', amount: '$50', confirmation: 'ABC123' } as unknown as NoticeLine;
    const out = enforceNotices(app('ergon'), [rich], range);
    expect(out.kept).toEqual([]);
    expect(out.rejected[0].reason).toMatch(/note, amount, confirmation/);
  });
  it('rejects a notice about another app, a kind the manifest does not list, and an empty key', () => {
    const out = enforceNotices(app('ergon'), [notice('a', { ref: { app: 'ktema', kind: 'x', id: '1' } }), notice('b', { kind: 'upkeep' }), notice('c', { key: '' })], range);
    expect(out.kept).toEqual([]);
    expect(out.rejected).toHaveLength(3);
  });
  it('keeps a time earlier today, which quiet hours can still carry forward, and rejects an earlier day', () => {
    const out = enforceNotices(app('ergon'), [notice('a', { at: new Date('2026-11-05T06:30:00') }), notice('b', { at: new Date('2026-11-04T23:30:00') })], range);
    expect(out.kept.map((line) => line.key)).toEqual(['ergon:a']);
    expect(out.rejected).toHaveLength(1);
  });
  it('rejects a time that is not a time or falls outside the range asked for', () => {
    const out = enforceNotices(app('ergon'), [notice('a', { at: new Date('nope') }), notice('b', { at: new Date('2026-11-04T09:00:00') }), notice('c', { at: new Date('2026-12-01T09:00:00') })], range);
    expect(out.kept).toEqual([]);
    expect(out.rejected).toHaveLength(3);
  });
  it('rejects an address outside the app, a double slash and a bare address that belongs to another app', () => {
    const out = enforceNotices(app('ergon'), [notice('a', { open: '/soma/' }), notice('e', { open: '/ergon/?open=chore%3Ac' }), notice('b', { open: '/ergon//x' }), notice('c', { open: 'ktema:today' }), notice('d', { open: 'today' })], range);
    expect(out.kept).toEqual([]);
    expect(out.rejected).toHaveLength(5);
  });
  it('rejects words that are not text, and the same notice twice', () => {
    const out = enforceNotices(app('ergon'), [notice('a', { title: '' }), notice('b', { body: 3 as unknown as string }), notice('c'), notice('c')], range);
    expect(out.kept.map((line) => line.key)).toEqual(['ergon:c']);
    expect(out.rejected).toHaveLength(3);
  });
});

describe('who may put notices forward', () => {
  it('needs the manifest to list notices, classify the fields, and name a source and kinds', () => {
    expect(mayProvideNotices(undefined, provider(() => []))?.reason).toMatch(/manifest/);
    expect(mayProvideNotices(APPS.find((each) => each.id === 'soma'), provider(() => [], { app: 'soma' }))?.reason).toMatch(/does not list notices/);
    const unclassified = { ...app('ergon'), notices: { ...app('ergon').notices, fields: undefined } };
    expect(mayProvideNotices(unclassified, provider(() => []))?.reason).toMatch(/not classified/);
    const noSource = { ...app('ergon'), notices: { ...app('ergon').notices, source: undefined } };
    expect(mayProvideNotices(noSource, provider(() => []))?.reason).toMatch(/no reminder source/);
    expect(mayProvideNotices(app('ergon'), provider(() => []))).toBeNull();
  });
  it('refuses private and shared classes, and a retired app', () => {
    expect(mayProvideNotices(app('ergon'), provider(() => [], { privacy: 'private' }))?.reason).toMatch(/class private/);
    expect(mayProvideNotices(app('ergon'), provider(() => [], { privacy: 'shared' }))?.reason).toMatch(/class shared/);
    expect(mayProvideNotices({ ...app('ergon'), status: 'retired' }, provider(() => []))?.reason).toMatch(/retired/);
  });
  it('classifies the fields of every app that provides notices, and only those', () => {
    const providing = APPS.filter((each) => each.provides?.includes('notices'));
    const moved = ['diaita', 'ergon', 'ktema', 'melete', 'philia', 'phyton', 'poreia', 'therapeia'];
    expect(providing.map((each) => each.id).sort()).toEqual(moved);
    expect(APPS.filter((each) => each.notices.fields).map((each) => each.id).sort()).toEqual(moved);
    for (const each of providing) {
      const fields = each.notices.fields!;
      expect(fields.shows.length, each.id).toBeGreaterThan(0);
      expect(fields.excludes.length, each.id).toBeGreaterThan(0);
      const stated = new Set([...fields.shows, ...fields.detailsOnly]);
      expect(fields.excludes.filter((field) => stated.has(field)), each.id).toEqual([]);
    }
  });
});

describe('the host', () => {
  it('asks only an app that is usable and whose own notice switch is on', async () => {
    let asked = 0;
    const counting = provider(() => (asked += 1, [notice('a')]));
    expect((await noticeLines([counting], manifest, ctx())).notices).toHaveLength(1);
    expect((await noticeLines([counting], manifest, ctx({ noticeSwitch: () => false }))).notices).toEqual([]);
    expect((await noticeLines([counting], manifest, ctx({ isUsable: () => false }))).notices).toEqual([]);
    expect((await noticeLines([counting], manifest, ctx({ noticeSwitch: undefined }))).notices).toEqual([]);
    expect(asked).toBe(1);
  });
  it('does not use the provider capability switch: only the person’s notice switch decides', async () => {
    const out = await noticeLines([provider(() => [notice('a')])], manifest, ctx({ enabled: () => false }));
    expect(out.notices).toHaveLength(1);
  });
  it('reports a provider that cannot read and goes on with the others', async () => {
    const broken = provider(() => { throw new Error('no store'); });
    const ktema = provider(() => [notice('k', { ref: { app: 'ktema', kind: 'u', id: 'k' }, kind: 'upkeep', key: 'ktema:k', open: 'ktema:today' })], { app: 'ktema' });
    const out = await noticeLines([broken, ktema], manifest, ctx());
    expect(out.notices.map((line) => line.key)).toEqual(['ktema:k']);
    expect(out.rejected[0].reason).toMatch(/could not read: no store/);
  });
  it('shows a key once across apps', async () => {
    const same = notice('a', { ref: { app: 'ktema', kind: 'u', id: 'a' }, kind: 'upkeep', key: 'ergon:a', open: 'ktema:today' });
    const out = await noticeLines([provider(() => [notice('a')]), provider(() => [same], { app: 'ktema' })], manifest, ctx());
    expect(out.notices).toHaveLength(1);
    expect(out.rejected[0].reason).toMatch(/another app already used/);
  });
  it('turns the notice back into the Notice other code uses by dropping only the ref', async () => {
    const [line] = (await noticeLines([provider(() => [notice('a')])], manifest, ctx())).notices;
    const { ref: _ref, ...plain } = line;
    expect(Object.keys(plain).sort()).toEqual(['at', 'body', 'key', 'kind', 'open', 'title']);
  });
});
