// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { remembers } from '../../core/notify/identity';
import { defaultNoticeSettings, privateNotice, type Notice } from '../../core/notify/notices';
import { wordsOf } from '../../core/notify/sources';
import { reminderTimes } from '../../app/sync/reminders';
import { setNoticeProviders } from '../../app/providers/noticePath';
import { choreNotices } from '../../ergon/core/notices';
import { upkeepNotices } from '../../ktema/core/notices';
import { plantNotices } from '../../phyton/core/notices';
import { careNotices, defaultCareNotices } from '../../therapeia/core/notices';
import { now, seed, until } from './noticeFixtures';

/*
 * Key migration K1 (docs/PHASE3_SLICE5_KEY_MIGRATION.md): Therapeia's doses, Ktema's and Ergon's day notices and Phyton's day notices have
 * keys made of record ids, never names or doses, and carry the key they had before as an earlier key. The ids are synced, so every device
 * makes the same key; the earlier key is on the device only; what was shown, seen or cleared under it stays so; the reminder times
 * the server is given do not change, only their ids.
 */
vi.mock('../../app/family/added', () => ({ isAdded: () => true, addedApps: () => [], useAddedApps: () => [] }));

const KINDS = new Set(['dose', 'upkeep', 'chore', 'plant']);
const NAMES = ['Amoxicillin', '500 mg', 'Clean the filter', 'Take out bins', 'Kitchen pothos'];

beforeEach(() => seed(true));
afterEach(() => localStorage.clear());

async function gathered() {
  const { familyNotices } = await import('../../app/notify/familyNotices');
  return (await familyNotices(now, until)).filter((notice) => KINDS.has(notice.kind) && !notice.key.startsWith('ktema:warranty') && !notice.key.startsWith('phyton:frost'));
}
const of = (list: readonly Notice[], kind: string) => list.find((notice) => notice.kind === kind)!;

describe('the new keys', () => {
  it('are made of record ids, with the old key as the earlier key', async () => {
    const list = await gathered();
    const dose = of(list, 'dose');
    const ms = dose.at.getTime();
    expect([dose.key, dose.also]).toEqual([`therapeia:dose:${ms}:m1`, [`therapeia:dose:${ms}:Amoxicillin, 500 mg`]]);
    expect([of(list, 'upkeep').key, of(list, 'upkeep').also]).toEqual(['ktema:2026-10-05:u1', ['ktema:2026-10-05:Clean the filter']]);
    expect([of(list, 'chore').key, of(list, 'chore').also]).toEqual(['ergon:2026-10-01:09:00:c1', ['ergon:2026-10-01:09:00:Take out bins']]);
    expect([of(list, 'plant').key, of(list, 'plant').also]).toEqual(['phyton:2026-10-05:pl1|/', ['phyton:2026-10-05:Kitchen pothos|/']]);
  });
  it('hold no name, dose or amount, in any new key', async () => {
    for (const notice of await gathered()) for (const word of NAMES) expect(notice.key, `${notice.key} / ${word}`).not.toContain(word);
  });
  it('leave every other app’s key and notice as it was, with no earlier key', async () => {
    const { familyNotices } = await import('../../app/notify/familyNotices');
    const others = (await familyNotices(now, until)).filter((notice) => !KINDS.has(notice.kind) || notice.key.startsWith('ktema:warranty') || notice.key.startsWith('phyton:frost'));
    expect(others.length).toBeGreaterThan(0);
    for (const notice of others) expect(notice.also, notice.key).toBeUndefined();
  });
  it('do not change when a record is renamed, and the earlier key does', async () => {
    const before = await gathered();
    localStorage.setItem('ktema:upkeep:u1', JSON.stringify({ id: 'u1', name: 'Replace the filter', thingId: 't1', every: { count: 1, unit: 'months' }, start: '2026-10-05', history: [], createdAt: '2026-09-01T00:00:00.000Z' }));
    localStorage.setItem('phyton:plant:pl1', JSON.stringify({ id: 'pl1', name: 'Window pothos', every: 7, start: '2026-10-05', log: [], place: 'Kitchen', createdAt: '2026-09-01T00:00:00.000Z' }));
    const after = await gathered();
    for (const kind of ['upkeep', 'plant']) {
      expect(of(after, kind).key).toBe(of(before, kind).key);
      expect(of(after, kind).also).not.toEqual(of(before, kind).also);
    }
  });
  it('are the same on every device: the order of records and of their names makes no difference', () => {
    const chore = (id: string, name: string) => ({ id, name, repeat: { kind: 'days' as const, every: 1 }, history: [{ date: '2026-09-30' }], start: '2026-09-01', createdAt: '' });
    const a = [chore('a', 'Zeta'), chore('b', 'Alpha')];
    const keys = (chores: typeof a) => choreNotices(chores, { on: true, at: '09:00', onlyMine: false }, undefined, '2026-10-01', 2).map((notice) => notice.key);
    expect(keys(a)).toEqual(keys([...a].reverse()));
    expect(keys(a)[0]).toMatch(/^ergon:2026-10-0\d:09:00:a\|b$/);
    const thing = { id: 't', name: 'x', category: 'Appliance' as const, createdAt: '' };
    const upkeep = (id: string, name: string) => ({ id, name, thingId: 't', every: { count: 1, unit: 'months' as const }, start: '2026-10-05', history: [], createdAt: '' });
    const ups = [upkeep('u2', 'Alpha'), upkeep('u1', 'Zeta')];
    const upKeys = (list: typeof ups) => upkeepNotices(list, [thing], { on: true, at: '09:00', warranties: false }, '2026-10-01', 14, now).map((notice) => notice.key);
    expect(upKeys(ups)).toEqual(upKeys([...ups].reverse()));
    expect(upKeys(ups)[0]).toBe('ktema:2026-10-05:u1|u2');
    const plant = (id: string, name: string) => ({ id, name, every: 7, start: '2026-10-05', log: [], createdAt: '' });
    const plants = [plant('p2', 'Alpha'), plant('p1', 'Zeta')];
    const pKeys = (list: typeof plants) => plantNotices(list as never, { on: true, at: '09:00', feed: false, onlyMine: false }, undefined, '2026-10-01', 14, now).map((notice) => notice.key);
    expect(pKeys(plants)).toEqual(pKeys([...plants].reverse()));
    expect(pKeys(plants)[0]).toBe('phyton:2026-10-05:p1|p2|/');
    const medicine = (id: string, name: string) => ({ id, name, times: [{ kind: 'clock' as const, at: '08:00' }], days: { kind: 'daily' as const }, start: '2026-09-25', taken: [], createdAt: '' });
    const meds = [medicine('m2', 'Alpha'), medicine('m1', 'Zeta')];
    const doseKeys = (list: typeof meds) => careNotices(list as never, [], defaultCareNotices, now, new Date(2026, 9, 2, 23)).filter((notice) => notice.kind === 'dose').map((notice) => notice.key);
    expect(doseKeys(meds)).toEqual(doseKeys([...meds].reverse()));
    expect(doseKeys(meds)[0]).toMatch(/:m1\|m2$/);
  });
});

describe('what leaves the device', () => {
  it('holds the new key and no earlier key, name or dose, in the sealed words, the lock-screen words or the row input', async () => {
    for (const notice of await gathered()) {
      const earlier = notice.also![0];
      const sent = JSON.stringify([wordsOf(notice), wordsOf(privateNotice(notice)), await reminderTimes([notice])]);
      expect(wordsOf(notice).k).toBe(notice.key.slice(0, 120));
      expect(sent, notice.key).not.toContain(earlier);
      for (const word of NAMES.filter((each) => notice.title.includes(each) === false && notice.body.includes(each) === false)) expect(sent, `${notice.key} / ${word}`).not.toContain(word);
    }
  });
  it('keeps the reminder times the server is given: the same moments, under new ids', async () => {
    const list = await gathered();
    const before = await reminderTimes(list.map((notice) => ({ ...notice, key: notice.also![0] })));
    const after = await reminderTimes(list);
    expect(after.map((row) => row.fire_at)).toEqual(before.map((row) => row.fire_at));
    expect(new Set(after.map((row) => row.id)).size).toBe(after.length);
    expect(after.every((row, index) => row.id !== before[index].id)).toBe(true);
  });
});

describe('what was shown, seen or cleared under the old key', () => {
  it('stays so under the new one', async () => {
    const list = await gathered();
    for (const notice of list) expect(remembers(new Set(notice.also), notice), notice.key).toBe(true);
    expect(remembers(new Set(['unrelated']), list[0])).toBe(false);
  });
  it('keeps the notifications page cleared, and remembers the entry under its new key as well', async () => {
    vi.resetModules();
    const { familyNotices } = await import('../../app/notify/familyNotices');
    const chore = (await familyNotices(now, until)).find((notice) => notice.kind === 'chore')!;
    localStorage.setItem('proairetosInboxCleared', JSON.stringify([chore.also![0]]));
    localStorage.setItem('proairetosInboxSeen', JSON.stringify([chore.also![0]]));
    const { refreshInbox } = await import('../../app/notify/inbox');
    await refreshInbox(now);
    const cleared = JSON.parse(localStorage.getItem('proairetosInboxCleared')!) as string[];
    expect(cleared).toContain(chore.key);
    expect(cleared).toContain(chore.also![0]);
  });
});

describe('the providers and the apps’ own functions', () => {
  it('give the same keys and the same earlier keys, so going back loses nothing', async () => {
    const { upcomingNotices } = await import('../../app/notify/upcoming');
    const settings = { ...defaultNoticeSettings, training: true };
    const identity = (list: readonly Notice[]) => list.filter((notice) => KINDS.has(notice.kind)).map((notice) => `${notice.key} < ${(notice.also ?? []).join(',')} @ ${notice.at.toISOString()}`);
    setNoticeProviders(false);
    const back = identity(await upcomingNotices(now, settings));
    setNoticeProviders(true);
    const through = identity(await upcomingNotices(now, settings));
    expect(back.length).toBeGreaterThan(0);
    expect(through).toEqual(back);
  });
});
