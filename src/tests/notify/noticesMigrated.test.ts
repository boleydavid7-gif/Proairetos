// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APPS } from '../../core/apps';
import { defaultNoticeSettings, privateNotice, type Notice, type NoticeSettings } from '../../core/notify/notices';
import { wordsOf } from '../../core/notify/sources';
import { noticeLines } from '../../core/providers';
import { saveQuietHours } from '../../data/storage/preferences';
import { providerModules } from '../../app/providers/registry';
import { hostContext } from '../../app/providers/context';
import { setNoticeProviders } from '../../app/providers/noticePath';
import { now, seed, until } from './noticeFixtures';

/*
 * Philia, Ergon, Ktema and Meletē, old way and new way. The same records and the same choices are gathered once by the
 * apps' own functions (the default) and once through their providers (the device switch), both through `upcomingNotices`, so the
 * person's switches and quiet hours act on each as they do in the app. What they say must be identical, field for field.
 */
vi.mock('../../app/family/added', () => ({ isAdded: () => true, addedApps: () => [], useAddedApps: () => [] }));

const APPS_MOVED = ['philia', 'ergon', 'ktema', 'melete'] as const;
const KINDS = new Set(['person', 'chore', 'upkeep', 'melete']);
const rows = (notices: readonly Notice[]) => notices.filter((notice) => KINDS.has(notice.kind)).map(({ key, kind, at, title, body, open }) => ({ key, kind, at: at.toISOString(), title, body, open }));
const FAMILY_OFF = { rhythm: false, people: false, chores: false, medicines: false, training: false, upkeep: false, plants: false, trips: false, melete: false };

async function both(settings: NoticeSettings) {
  const { upcomingNotices } = await import('../../app/notify/upcoming');
  setNoticeProviders(false);
  const legacy = await upcomingNotices(now, settings);
  setNoticeProviders(true);
  const provided = await upcomingNotices(now, settings);
  setNoticeProviders(false);
  return { legacy, provided };
}

// The shared chore is due this morning, before the test’s “now”, so a second one is due on a later day for the notices to carry.
beforeEach(() => {
  seed(false);
  localStorage.setItem('ergon:chore:c2', JSON.stringify({ id: 'c2', name: 'Water the lawn', repeat: { kind: 'days', every: 3 }, history: [{ date: '2026-09-30' }], start: '2026-09-01' }));
});
afterEach(() => localStorage.clear());

describe('the four apps, old way and new way', () => {
  it('say the same, field for field, with every switch on', async () => {
    const { legacy, provided } = await both({ ...defaultNoticeSettings, melete: true });
    expect(rows(legacy).length).toBeGreaterThan(0);
    for (const kind of KINDS) expect(rows(legacy).some((row) => row.kind === kind), kind).toBe(true);
    expect(rows(provided)).toEqual(rows(legacy));
  });
  it('say the same when quiet hours hold a notice until they end', async () => {
    saveQuietHours({ on: true, start: '08:00', end: '10:00', duringProtected: true });
    const { legacy, provided } = await both({ ...defaultNoticeSettings, melete: true });
    const held = rows(legacy).filter((row) => row.kind === 'upkeep' || row.kind === 'chore');
    expect(held.length).toBeGreaterThan(0);
    expect(rows(provided)).toEqual(rows(legacy));
  });
  it('say the same when quiet hours carry a notice from earlier today to after now', async () => {
    saveQuietHours({ on: true, start: '08:00', end: '13:00', duringProtected: true });
    const { legacy, provided } = await both({ ...defaultNoticeSettings, melete: true });
    const carried = rows(legacy).filter((row) => row.key.startsWith('ergon:2026-10-01'));
    expect(carried.map((row) => row.at)).toEqual([new Date(2026, 9, 1, 13).toISOString()]);
    expect(rows(provided)).toEqual(rows(legacy));
  });
  it('say the same with one switch on at a time, and nothing for a switch that is off', async () => {
    for (const [key, kind] of [['people', 'person'], ['chores', 'chore'], ['upkeep', 'upkeep']] as const) {
      const { legacy, provided } = await both({ ...defaultNoticeSettings, ...FAMILY_OFF, [key]: true });
      expect(new Set(rows(legacy).map((row) => row.kind)), key).toEqual(new Set([kind]));
      expect(rows(provided), key).toEqual(rows(legacy));
    }
    const off = await both({ ...defaultNoticeSettings, ...FAMILY_OFF });
    expect(rows(off.legacy)).toEqual([]);
    expect(rows(off.provided)).toEqual([]);
  });
  it('say the same in the closed-app inputs: the source, the words with details on, and the words kept private', async () => {
    const { legacy, provided } = await both({ ...defaultNoticeSettings, melete: true });
    const delivery = (notices: readonly Notice[]) => notices.filter((notice) => KINDS.has(notice.kind)).map((notice) => ({ key: notice.key, at: notice.at.toISOString(), details: wordsOf(notice), private: wordsOf(privateNotice(notice)) }));
    expect(delivery(provided)).toEqual(delivery(legacy));
  });
  it('show each notice once: the legacy gather leaves the four out when they come through providers', async () => {
    const { provided } = await both({ ...defaultNoticeSettings, melete: true });
    const keys = rows(provided).map((row) => row.key);
    expect(new Set(keys).size).toBe(keys.length);
    const { familyNotices } = await import('../../app/notify/familyNotices');
    expect(rows(await familyNotices(now, until, new Set(APPS_MOVED)))).toEqual([]);
    expect(rows(await familyNotices(now, until)).length).toBeGreaterThan(0);
  });
  it('differ in one way, found while writing this: Meletē’s switch alone brings its notices only through providers', async () => {
    // The old gather runs only when one of the other family switches is on (Meletē's is not in that list), so with
    // only Meletē’s on it gives nothing; the provider path asks Meletē on its own switch. Reported, not hidden.
    const { legacy, provided } = await both({ ...defaultNoticeSettings, ...FAMILY_OFF, melete: true });
    expect(rows(legacy)).toEqual([]);
    expect(rows(provided).length).toBeGreaterThan(0);
    expect(new Set(rows(provided).map((row) => row.kind))).toEqual(new Set(['melete']));
  });
});

describe('what the four providers keep out', () => {
  it('lets no marked value into a notice, its words with details on or off, or what the host rejects', async () => {
    const ctx = { ...hostContext(now), range: { from: now, until }, noticeSwitch: () => true, blocks: async () => [] };
    const providers = (await Promise.all(APPS_MOVED.map((app) => providerModules[app]!()))).flatMap((module) => module.providers).filter((provider) => provider.capability === 'notices');
    expect(providers).toHaveLength(4);
    const out = await noticeLines(providers as never, APPS, ctx);
    expect(out.rejected).toEqual([]);
    expect(out.notices.length).toBeGreaterThan(0);
    const everything = JSON.stringify([out.notices, out.notices.map((line) => wordsOf(line)), out.notices.map((line) => wordsOf(privateNotice(line as Notice)))]);
    expect(everything).not.toMatch(/CANARY/i);
    // The notices do carry what the manifest lists: a person’s name, a chore, a thing, a subject.
    expect(everything).toMatch(/Mia/);
    expect(everything).toMatch(/Take out bins/);
    expect(everything).toMatch(/Biology/);
  });
  it('reads no more than it has classified: every excluded field is named in the manifest', () => {
    for (const id of APPS_MOVED) {
      const fields = APPS.find((app) => app.id === id)!.notices.fields!;
      expect(fields.excludes.length, id).toBeGreaterThan(3);
    }
  });
});
