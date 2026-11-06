// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APPS, type AppManifest } from '../../core/apps';
import { cameDue } from '../../core/notify/inbox';
import { carryOver, identitiesOf, remembers } from '../../core/notify/identity';
import { privateNotice, type Notice } from '../../core/notify/notices';
import { reminderTimes } from '../../app/sync/reminders';
import { wordsOf } from '../../core/notify/sources';
import { enforceNotices, noticeLines, type HostContext, type NoticeLine, type Provider } from '../../core/providers';

/*
 * K0 of the key migration (docs/PHASE3_SLICE5_KEY_MIGRATION.md): a notice may carry earlier keys (`also`), and whatever asks whether a
 * notice was shown, seen or cleared asks for the key or any earlier one. Nothing sets `also` yet, so nothing changes for a person; these
 * tests hold the mechanism, and that an earlier key never leaves the device.
 */
const at = new Date('2026-11-05T09:00:00');
const notice = (key: string, also?: string[]): Notice => ({ key, kind: 'upkeep', at, title: 'Clean the filter', body: 'Today.', open: 'ktema:today', ...(also ? { also } : {}) });

describe('identity', () => {
  it('knows a notice by its key and its earlier keys', () => {
    expect(identitiesOf(notice('new', ['old']))).toEqual(['new', 'old']);
    expect(identitiesOf(notice('only'))).toEqual(['only']);
    expect(remembers(new Set(['old']), notice('new', ['old']))).toBe(true);
    expect(remembers(new Set(['new']), notice('new', ['old']))).toBe(true);
    expect(remembers(new Set(['other']), notice('new', ['old']))).toBe(false);
  });
  it('remembers an entry under its new key once it is known under an old one, and not otherwise', () => {
    const keys = new Set(['old']);
    expect(carryOver(keys, notice('new', ['old']))).toBe(true);
    expect([...keys].sort()).toEqual(['new', 'old']);
    expect(carryOver(keys, notice('new', ['old']))).toBe(false);
    expect(carryOver(new Set(['x']), notice('new', ['old']))).toBe(false);
  });
  it('is the same rule the worker keeps', () => {
    const source = readFileSync('public/sw.js', 'utf8');
    const match = source.match(/const wasShown = (\(shown, notice\) => [^\n]+);/);
    expect(match, 'wasShown in public/sw.js').toBeTruthy();
    const wasShown = new Function(`return ${match![1]}`)() as (shown: Set<string>, notice: { key: string; also?: readonly string[] }) => boolean;
    for (const keys of [['old'], ['new'], ['other'], []]) {
      for (const candidate of [notice('new', ['old']), notice('new')]) expect(wasShown(new Set(keys), candidate)).toBe(remembers(new Set(keys), candidate));
    }
  });
});

describe('an earlier key stays on the device', () => {
  const withAlias = notice('new-key', ['LEGACY-KEY-WITH-A-NAME']);
  it('is not in the sealed words, the lock-screen words or the server row inputs', async () => {
    expect(JSON.stringify([wordsOf(withAlias), wordsOf(privateNotice(withAlias))])).not.toContain('LEGACY');
    const [row] = await reminderTimes([withAlias]);
    const [same] = await reminderTimes([notice('new-key')]);
    expect(row).toEqual(same);
    expect(JSON.stringify(row)).not.toContain('LEGACY');
  });
  it('is carried to the notifications page, which remembers what was cleared under it', () => {
    const [entry] = cameDue([withAlias], new Date('2026-11-05T12:00:00'));
    expect(entry.also).toEqual(['LEGACY-KEY-WITH-A-NAME']);
    expect(cameDue([notice('plain')], new Date('2026-11-05T12:00:00'))[0]).not.toHaveProperty('also');
  });
});

describe('the notifications page keeps what was cleared across a key change', () => {
  afterEach(() => localStorage.clear());
  it('clears and sees the new key too, and forgets an old key only when nothing carries it', async () => {
    vi.resetModules();
    localStorage.setItem('proairetosInboxCleared', JSON.stringify(['old']));
    localStorage.setItem('proairetosInboxSeen', JSON.stringify(['old', 'gone']));
    const now = new Date('2026-11-05T12:00:00');
    vi.doMock('../../app/notify/upcoming', () => ({ upcomingNotices: async () => [notice('new', ['old'])] }));
    vi.doMock('../../app/family/added', () => ({ isAdded: () => false }));
    const { refreshInbox } = await import('../../app/notify/inbox');
    await refreshInbox(now);
    const cleared = JSON.parse(localStorage.getItem('proairetosInboxCleared')!) as string[];
    const seen = JSON.parse(localStorage.getItem('proairetosInboxSeen')!) as string[];
    expect(cleared.sort()).toEqual(['new', 'old']);
    expect(seen.sort()).toEqual(['new', 'old']);
    vi.doUnmock('../../app/notify/upcoming');
    vi.doUnmock('../../app/family/added');
  });
});

describe('the contract carries earlier keys safely', () => {
  const range = { from: new Date('2026-11-05T00:00:00'), until: new Date('2026-11-19T12:00:00') };
  const ktema = APPS.find((app) => app.id === 'ktema') as AppManifest;
  const line = (key: string, also?: string[]): NoticeLine => ({ ref: { app: 'ktema', kind: 'upkeep', id: key }, kind: 'upkeep', key, at, title: 'Clean the filter', body: 'Today.', open: 'ktema:today', ...(also ? { also } : {}) });
  it('accepts up to four other keys and rejects the notice\u2019s own key, an empty one or a fifth', () => {
    expect(enforceNotices(ktema, [line('a', ['x', 'y', 'z', 'w'])], range).kept).toHaveLength(1);
    for (const bad of [['a'], [''], ['1', '2', '3', '4', '5'], [3 as unknown as string]]) expect(enforceNotices(ktema, [line('a', bad)], range).kept, JSON.stringify(bad)).toHaveLength(0);
  });
  it('drops an earlier key that is another notice\u2019s key, so it cannot hide that notice', async () => {
    const provider: Provider<'notices'> = { app: 'ktema', capability: 'notices', version: 1, privacy: 'own-search', sources: [], read: () => [line('a', ['b']), line('b')] };
    const ctx: HostContext = { today: '2026-11-05', now: range.from, range, records: async () => [], setting: () => null, isUsable: () => true, enabled: () => true, noticeSwitch: () => true };
    const out = await noticeLines([provider], APPS, ctx);
    expect(out.notices.find((each) => each.key === 'a')).not.toHaveProperty('also');
    expect(out.rejected.some((each) => /another notice/.test(each.reason))).toBe(true);
  });
});
