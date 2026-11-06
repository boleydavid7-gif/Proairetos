// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { defaultNoticeSettings } from '../../core/notify/notices';
import { saveQuietHours } from '../../data/storage/preferences';
import { now, seed } from './noticeFixtures';
import { seedMore } from './noticeFixturesMore';

/*
 * The baseline for Dynamis, Askesis run days and Oikonomia bills (Slice 5, commit 6), recorded from the apps' own functions before
 * they move: every field of the notices for these three kinds, and the delivery inputs (source, row id, fire time, the words with
 * details on, the words kept private). Written with NOTICES_BASELINE=write; compared otherwise, one file a time zone.
 */
vi.mock('../../app/family/added', () => ({ isAdded: () => true, addedApps: () => [], useAddedApps: () => [] }));

const zone = process.env.TZ || 'UTC';
const FILE = resolve(process.cwd(), 'src/tests/notify/fixtures', `noticesBaselineMore.${zone.replace(/\W+/g, '-').toLowerCase()}.json`);
const KINDS = new Set(['training', 'run', 'bill']);
const settings = { ...defaultNoticeSettings, runs: true, bills: true, training: true };

async function capture(quiet: { start: string; end: string }) {
  localStorage.clear();
  seed(false);
  await seedMore();
  saveQuietHours({ on: true, start: quiet.start, end: quiet.end, duringProtected: true });
  const { upcomingNotices } = await import('../../app/notify/upcoming');
  const { privateNotice } = await import('../../core/notify/notices');
  const { sourceOf, wordsOf } = await import('../../core/notify/sources');
  const { reminderTimes } = await import('../../app/sync/reminders');
  const list = (await upcomingNotices(now, settings)).filter((notice) => KINDS.has(notice.kind));
  const times = await reminderTimes(list);
  return {
    notices: list.map(({ key, kind, at, title, body, open }) => ({ key, kind, at: at.toISOString(), title, body, open })),
    delivery: list.map((notice, index) => ({ key: notice.key, source: sourceOf(notice), id: times[index].id, fire_at: times[index].fire_at, details: wordsOf(notice), private: wordsOf(privateNotice(notice)) })),
  };
}

describe('notice baseline: Dynamis, Askesis runs, Oikonomia bills', () => {
  let result: Record<string, Awaited<ReturnType<typeof capture>>> = {};
  beforeAll(async () => {
    // The usual quiet hours put the 6:30 run inside them; the second window holds the 9:00 bills.
    result = { 'usual quiet hours': await capture({ start: '22:00', end: '07:00' }), 'quiet hours over the bills': await capture({ start: '08:00', end: '10:00' }) };
  }, 60_000);

  it('covers the three apps', () => {
    for (const scenario of Object.values(result)) {
      const kinds = new Set(scenario.notices.map((row) => row.kind));
      for (const kind of KINDS) expect(kinds.has(kind), kind).toBe(true);
    }
  });
  it('matches the recorded baseline', () => {
    if (process.env.NOTICES_BASELINE === 'write') {
      writeFileSync(FILE, JSON.stringify(result, null, 2) + '\n');
      return;
    }
    expect(existsSync(FILE), `no baseline for ${zone}`).toBe(true);
    expect(JSON.parse(JSON.stringify(result))).toEqual(JSON.parse(readFileSync(FILE, 'utf8')));
  });
});
