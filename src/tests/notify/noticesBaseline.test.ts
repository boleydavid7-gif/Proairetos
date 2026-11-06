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
const KNOWN_LEAKS: string[] = ['CANARY-JFK', 'CANARY-street', 'CANARY-where', 'CANARYCODE', 'CANARYSTAY'];
type Row = { key: string; kind: string; at: string; title: string; body: string; open: string };
const rowOf = (notice: { key: string; kind: string; at: Date; title: string; body: string; open: string }): Row => ({ key: notice.key, kind: notice.kind, at: notice.at.toISOString(), title: notice.title, body: notice.body, open: notice.open });

async function capture(names: boolean) {
  seed(names);
  const { familyNotices } = await import('../../app/notify/familyNotices');
  const { privateNotice } = await import('../../core/notify/notices');
  const { sourceOf, wordsOf } = await import('../../core/notify/sources');
  const { reminderTimes } = await import('../../app/sync/reminders');
  const list = (await familyNotices(now, until)).sort((a, b) => a.at.getTime() - b.at.getTime() || a.key.localeCompare(b.key));
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

  it('records which marked fields reach the words today', () => {
    // Slice 5 removes these (Poreia code, address and departure place; Oikonomia amounts are covered when it joins).
    // Until then they are the whole list; any other marker appearing here would be a new leak.
    const found = [...new Set(JSON.stringify(result).match(/CANARY[\w-]*/gi) ?? [])].sort();
    expect(found).toEqual(KNOWN_LEAKS);
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
