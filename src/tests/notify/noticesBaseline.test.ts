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
const now = new Date(2026, 9, 1, 12, 0);
const until = new Date(now.getTime() + 14 * 86_400_000);
const at = (day: number, time = '09:00') => `2026-10-${String(day).padStart(2, '0')}T${time}`;
const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const stamp = '2026-09-01T00:00:00.000Z';

function seed(names: boolean) {
  localStorage.clear();
  for (const app of ['philia', 'ergon', 'ktema', 'melete', 'phyton', 'poreia', 'diaita']) put(`${app}:settings`, { started: true });
  put('therapeia:settings', { started: true, notices: { doses: true, names, refills: true, appointments: true, appointmentLead: 120 } });

  put('philia:person:p1', { id: 'p1', name: 'Mia', birthday: '1990-10-04', dates: [{ id: 'd1', label: 'Anniversary', date: '10-09' }], notes: [{ id: 'n', text: 'CANARY-remember', at: stamp }], gifts: [], times: [], touchEvery: 20, lastInTouch: '2026-09-01', phone: '555-CANARY', email: 'canary@example.com' });
  put('ergon:chore:c1', { id: 'c1', name: 'Take out bins', room: 'CANARY-room', repeat: { kind: 'days', every: 2 }, history: [{ date: '2026-09-29' }], start: '2026-09-01', note: 'CANARY-note' });
  put('ktema:thing:t1', { id: 't1', name: 'Dishwasher', category: 'Appliance', serial: 'CANARY-serial', price: '$649', warrantyUntil: '2026-10-20', note: 'CANARY-note', createdAt: stamp });
  put('ktema:upkeep:u1', { id: 'u1', name: 'Clean the filter', thingId: 't1', every: { count: 1, unit: 'months' }, start: '2026-10-05', history: [], note: 'CANARY-note', createdAt: stamp });
  put('melete:subject:s1', { id: 's1', name: 'Biology', dates: [{ id: 'sd1', title: 'Final', date: '2026-10-08', kind: 'exam', hours: 9 }], materials: [{ id: 'm1', title: 'CANARY-material', url: 'https://example.com/canary' }], ifThen: 'CANARY-ifthen', createdAt: stamp });
  put('melete:session:x1', { id: 'x1', subjectId: 's1', kind: 'read', start: at(3, '16:00'), minutes: 45 });
  put('phyton:plant:pl1', { id: 'pl1', name: 'Kitchen pothos', every: 7, start: '2026-10-05', log: [], place: 'Kitchen', createdAt: stamp });
  put('therapeia:medicine:m1', { id: 'm1', name: 'Amoxicillin', dose: '500 mg', note: 'CANARY-note', times: [{ kind: 'clock', at: '08:00' }], days: { kind: 'daily' }, start: '2026-09-25', taken: [], supply: { count: 8, countedAt: '2026-10-01T08:00:00.000Z', perDose: 1, lead: 3 }, createdAt: stamp });
  put('therapeia:visit:v1', { id: 'v1', with: 'Dr Patel', at: at(6, '14:30'), where: 'Clinic CANARY-where', questions: [{ id: 'q', text: 'CANARY-question' }], note: 'CANARY-note' });
  put('poreia:trip:r1', { id: 'r1', name: 'Lisbon', place: { name: 'Lisbon', label: 'Lisbon, Portugal' }, start: '2026-10-02', end: '2026-10-09', travelers: 1, stage: 'booked' });
  put('poreia:booking:b1', { id: 'b1', tripId: 'r1', kind: 'flight', title: 'TP 237', provider: 'TAP', confirmation: 'CANARYCODE', startDate: '2026-10-02', startTime: '07:40', from: 'CANARY-JFK', to: 'LIS', address: 'CANARY-address', notes: 'CANARY-note', createdAt: stamp, updatedAt: stamp });
  put('poreia:booking:b2', { id: 'b2', tripId: 'r1', kind: 'stay', title: 'Hotel Avenida', confirmation: 'CANARYSTAY', startDate: '2026-10-02', endDate: '2026-10-09', address: 'CANARY-street 1', createdAt: stamp, updatedAt: stamp });
  put('poreia:plan:pn1', { id: 'pn1', tripId: 'r1', date: '2026-10-03', time: '12:30', title: 'Lunch', where: 'Alfama', note: 'CANARY-note', createdAt: stamp });
  put('poreia:pack:k1', { id: 'k1', tripId: 'r1', text: 'Charger', done: false });
}

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
