// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/*
 * The notice baseline (Phase 3, Slice 5, commit 0). It records exactly what the apps' notices are today, from fixed
 * records on a fixed day: every field of every notice, and what the closed-app delivery would be given (the source,
 * the opaque row id and fire time, and the words after the lock-screen choice). A later change that moves notices
 * behind providers must reproduce this file byte for byte. Written with NOTICES_BASELINE=write; compared otherwise.
 * The file name carries the time zone, since the words and times are the person's local ones.
 */
vi.mock('../../app/family/added', () => ({ isAdded: () => true, addedApps: () => [], useAddedApps: () => [] }));

const zone = process.env.TZ || 'UTC';
const FILE = resolve(process.cwd(), 'src/tests/notify/fixtures', `noticesBaseline.${zone.replace(/\W+/g, '-').toLowerCase()}.json`);
import { now, seed, until } from './noticeFixtures';
/*
 * The differences from the recorded baseline that the privacy decisions call for, and no others. Each lists the words the
 * baseline holds (checked, so this table cannot drift from the file) and the words now. The baseline files are not edited.
 *   Poreia: no confirmation code, no stay address, no place a trip leaves from.
 *   Therapeia: a visit follows the names choice (off: "A visit", the time only); a dose never states its amount (with names on,
 *   "Amoxicillin, 500 mg" is "Amoxicillin"). The dose notice's key still holds the amount, so it is not in this table.
 */
const CHANGES: Record<string, { scenarios: string[]; was: { title: string; body: string }; now: { title: string; body: string } }> = {
  'poreia:leave:b1:2026-10-02T07:40': { scenarios: ['defaults', 'therapeia names on'], was: { title: 'TP 237', body: 'Leaves 7:40 AM · from CANARY-JFK · Confirmation CANARYCODE' }, now: { title: 'TP 237', body: 'Leaves 7:40 AM' } },
  'poreia:start:b2:2026-10-02': { scenarios: ['defaults', 'therapeia names on'], was: { title: 'Hotel Avenida', body: 'Check-in today · CANARY-street 1 · Confirmation CANARYSTAY' }, now: { title: 'Hotel Avenida', body: 'Check-in today' } },
  'therapeia:visit:v1:2026-10-06T14:30': { scenarios: ['defaults'], was: { title: 'Dr Patel', body: '2:30 PM · Clinic CANARY-where' }, now: { title: 'A visit', body: '2:30 PM' } },
};
const CHANGED_ROWS = 5; // three keys, the first two in both scenarios
const DOSE_WAS = 'Amoxicillin, 500 mg';
const DOSE_NOW = 'Amoxicillin';
const DOSE_ROWS = 14; // names on: one a day for the two weeks
type Row = { key: string; kind: string; at: string; title: string; body: string; open: string };
const rowOf = (notice: { key: string; kind: string; at: Date; title: string; body: string; open: string }): Row => ({ key: notice.key, kind: notice.kind, at: notice.at.toISOString(), title: notice.title, body: notice.body, open: notice.open });

async function capture(names: boolean) {
  seed(names);
  const { familyNotices } = await import('../../app/notify/familyNotices');
  const { privateNotice } = await import('../../core/notify/notices');
  const { sourceOf, wordsOf } = await import('../../core/notify/sources');
  const { reminderTimes } = await import('../../app/sync/reminders');
  // Four apps' keys are made of record ids now (key migration K1) and carry the key they had as an earlier key. The baseline is what the
  // notices were, so each is read under the key it had; noticeKeys.test.ts holds the new keys.
  const asBefore = (await familyNotices(now, until)).map(({ also, ...notice }) => (also?.length ? { ...notice, key: also[0] } : notice));
  const list = asBefore.sort((a, b) => a.at.getTime() - b.at.getTime() || a.key.localeCompare(b.key));
  const bad = list.filter((notice) => Number.isNaN(notice.at.getTime()));
  if (bad.length) throw new Error(`invalid time: ${bad.map((notice) => notice.key).join(', ')}`);
  const times = await reminderTimes(list);
  return {
    notices: list.map(rowOf),
    // What the server and the lock screen are given, with the lock-screen details on and off.
    delivery: list.map((notice, index) => ({
      key: notice.key,
      source: sourceOf(notice),
      id: times[index].id,
      fire_at: times[index].fire_at,
      details: wordsOf(notice),
      private: wordsOf(privateNotice(notice)),
    })),
  };
}

describe('notice baseline', () => {
  let result: Record<string, Awaited<ReturnType<typeof capture>>> = {};
  beforeAll(async () => {
    result = { defaults: await capture(false), 'therapeia names on': await capture(true) };
  }, 60_000);
  afterAll(() => localStorage.clear());

  it('covers each app that gathers through familyNotices', () => {
    const kinds = new Set(result.defaults.notices.map((row) => row.kind));
    for (const kind of ['person', 'chore', 'upkeep', 'melete', 'plant', 'trip', 'dose', 'care']) expect(kinds.has(kind), kind).toBe(true);
  });

  it('keeps every marked value out of the words, except the place a visit shows when names are chosen', () => {
    expect(JSON.stringify(result.defaults)).not.toMatch(/CANARY/i);
    const named = [...new Set(JSON.stringify(result['therapeia names on']).match(/CANARY[\w-]*/gi) ?? [])];
    expect(named).toEqual(['CANARY-where']);
  });

  it('matches the recorded baseline, apart from the listed privacy differences', () => {
    if (process.env.NOTICES_BASELINE === 'write') {
      writeFileSync(FILE, JSON.stringify(result, null, 2) + '\n');
      return;
    }
    expect(existsSync(FILE), `no baseline for ${zone}`).toBe(true);
    const recorded = JSON.parse(readFileSync(FILE, 'utf8')) as typeof result;
    let changed = 0;
    let doses = 0;
    for (const [scenario, value] of Object.entries(recorded)) {
      for (const row of value.notices) {
        if (scenario === 'therapeia names on' && row.kind === 'dose') {
          expect({ title: row.title, body: row.body }, row.key).toEqual({ title: DOSE_WAS, body: 'Now.' });
          row.title = DOSE_NOW;
          doses += 1;
          continue;
        }
        const change = CHANGES[row.key];
        if (!change?.scenarios.includes(scenario)) continue;
        // The table says what the baseline holds; if the file differs, the table is wrong, not the app.
        expect({ title: row.title, body: row.body }, row.key).toEqual(change.was);
        row.title = change.now.title;
        row.body = change.now.body;
        changed += 1;
      }
      for (const row of value.delivery) {
        if (scenario === 'therapeia names on' && row.key.startsWith('therapeia:dose:')) {
          expect({ t: row.details.t, b: row.details.b }, row.key).toEqual({ t: DOSE_WAS, b: 'Now.' });
          row.details.t = DOSE_NOW;
          continue;
        }
        const change = CHANGES[row.key];
        if (!change?.scenarios.includes(scenario)) continue;
        expect({ t: row.details.t, b: row.details.b }, row.key).toEqual({ t: change.was.title, b: change.was.body });
        row.details.t = change.now.title;
        row.details.b = change.now.body;
      }
    }
    expect(changed).toBe(CHANGED_ROWS);
    expect(doses).toBe(DOSE_ROWS);
    expect(JSON.parse(JSON.stringify(result))).toEqual(recorded);
  });
});
