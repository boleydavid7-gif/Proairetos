// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { APPS, type AppManifest } from '../../core/apps';
import { toNoticeBlocks, type HostContext, type NoticeLine, type Provider } from '../../core/providers';
import { defaultNoticeSettings } from '../../core/notify/notices';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { noticeProvidersOn, setNoticeProviders } from '../../app/providers/noticePath';
import { noticesFrom, noticeSwitchOn, providedNoticeApps, providerNotices } from '../../app/providers/notices';

const at = (h: number) => new Date(2026, 10, 6, h);
const occurrence = (extra: Partial<ScheduleOccurrence>): ScheduleOccurrence => ({ patternId: 'p', patternName: 'Rota', kind: 'COMMITTED', date: '2026-11-06', start: at(8), end: at(16), changed: false, ...extra });

describe('the blocks a notice provider is given', () => {
  it('gives an own shift its name (its label, else the schedule’s) and nothing else', () => {
    const [named, plain] = toNoticeBlocks([occurrence({ label: 'Night', patternName: 'Rota' }), occurrence({ patternName: 'Rota' })], []);
    expect(named).toEqual({ start: at(8), end: at(16), kind: 'COMMITTED', label: 'Night' });
    expect(plain.label).toBe('Rota');
  });
  it('gives another calendar’s block only start, end and kind, whatever the source holds', () => {
    const event = occurrence({ kind: 'PROTECTED', label: 'CANARY-title', patternName: 'CANARY-calendar', patternId: 'calendar:x' });
    const [block] = toNoticeBlocks([], [event]);
    expect(Object.keys(block).sort()).toEqual(['end', 'kind', 'start']);
    expect(JSON.stringify(block)).not.toMatch(/CANARY/);
  });
  it('leaves an own block with no name without a label key', () => {
    const [block] = toNoticeBlocks([occurrence({ patternName: '' })], []);
    expect('label' in block).toBe(false);
  });
});

describe('the notice adapter', () => {
  afterEach(() => localStorage.clear());
  const range = { from: new Date(2026, 10, 5, 12), until: new Date(2026, 10, 19, 12) };
  const classified: AppManifest[] = APPS.map((app) => (app.id === 'ergon' ? { ...app, provides: [...(app.provides ?? []), 'notices' as const], notices: { ...app.notices, fields: { shows: ['a name'], detailsOnly: [], excludes: ['notes'] } } } : app));
  const line = (key: string): NoticeLine => ({ ref: { app: 'ergon', kind: 'chore', id: key }, kind: 'chore', key, at: new Date(2026, 10, 6, 9), title: 'Bins', body: 'Today.', open: 'ergon' });
  const provider = (read: Provider<'notices'>['read']): Provider<'notices'> => ({ app: 'ergon', capability: 'notices', version: 1, privacy: 'own-search', sources: [], read });
  const ctx = (extra: Partial<HostContext> = {}): HostContext => ({ today: '2026-11-05', now: range.from, range, records: async () => [], setting: () => null, isUsable: () => true, enabled: () => true, noticeSwitch: () => true, ...extra });

  it('is off until the device is switched on, and says so safely when storage is blocked', () => {
    expect(noticeProvidersOn()).toBe(false);
    setNoticeProviders(true);
    expect(noticeProvidersOn()).toBe(true);
    setNoticeProviders(false);
    expect(noticeProvidersOn()).toBe(false);
    localStorage.setItem('proairetosNoticeProviders', 'yes');
    expect(noticeProvidersOn()).toBe(false);
  });
  it('asks no one while no app provides notices, so switching it on changes nothing yet', async () => {
    expect(providedNoticeApps()).toEqual([]);
    expect(await providerNotices(range.from, range.until, defaultNoticeSettings)).toEqual([]);
  });
  it('follows the person’s own notice switch, the first switch the manifest lists for the app', () => {
    expect(noticeSwitchOn('ergon', { ...defaultNoticeSettings, chores: true })).toBe(true);
    expect(noticeSwitchOn('ergon', { ...defaultNoticeSettings, chores: false })).toBe(false);
    expect(noticeSwitchOn('askesis', { ...defaultNoticeSettings, runs: false, runMilestones: true })).toBe(false);
    expect(noticeSwitchOn('soma', defaultNoticeSettings)).toBe(false);
    for (const app of APPS.filter((each) => each.notices.source)) {
      const key = app.notices.switches[0]?.key;
      if (key) expect(key in defaultNoticeSettings, `${app.id}: ${key}`).toBe(true);
    }
  });
  it('turns notice lines into the Notice other code uses, without the ref', async () => {
    const [notice] = await noticesFrom([provider(() => [line('ergon:a')])], classified, ctx());
    expect(Object.keys(notice).sort()).toEqual(['at', 'body', 'key', 'kind', 'open', 'title']);
  });
  it('lets a provider read blocks through the context and nothing from another calendar’s title', async () => {
    const seen: unknown[] = [];
    const blocks = async () => toNoticeBlocks([], [occurrence({ label: 'CANARY-title' })]);
    await noticesFrom([provider(async (c) => (seen.push(await c.blocks!(range.from, range.until)), []))], classified, ctx({ blocks }));
    expect(JSON.stringify(seen)).not.toMatch(/CANARY/);
    expect(seen).toHaveLength(1);
  });
  it('gives nothing for an app whose own switch is off', async () => {
    expect(await noticesFrom([provider(() => [line('ergon:a')])], classified, ctx({ noticeSwitch: (app) => noticeSwitchOn(app, { ...defaultNoticeSettings, chores: false }) }))).toEqual([]);
  });
});
