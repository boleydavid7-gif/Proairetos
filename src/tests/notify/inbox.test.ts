import { describe, expect, it } from 'vitest';
import { agoText, arrangeInbox, byApp, cameDue, isImportant, runMilestones, scheduleChanges, strengthMilestones, type InboxEntry } from '../../core/notify/inbox';
import type { Notice } from '../../core/notify/notices';
import type { LogEntry } from '../../askesis/core/log';
import type { Workout } from '../../dynamis/core/plan';

const now = new Date('2026-10-29T12:00:00');
const notice = (kind: Notice['kind'], hoursAgo: number, open = 'today'): Notice => ({ key: `${kind}:${hoursAgo}`, kind, at: new Date(now.getTime() - hoursAgo * 3_600_000), title: kind, body: '', open });

describe('notifications page', () => {
  it('keeps notices whose time has come, leaving out sleep, water, the bell and shift starts', () => {
    const kept = cameDue([notice('bill', 2), notice('rhythm', 1), notice('hydration', 1), notice('bell', 1), notice('schedule', 1), notice('item', -1), notice('dose', 100)], now);
    expect(kept.map((entry) => entry.kind)).toEqual(['bill']);
  });

  it('brings schedule changes, bills, care and trips forward as important', () => {
    expect(isImportant({ kind: 'schedule-change' })).toBe(true);
    expect(isImportant({ kind: 'bill' })).toBe(true);
    expect(isImportant({ kind: 'chore' })).toBe(false);
    expect(isImportant({ kind: 'milestone' })).toBe(false);
  });

  it('says how long ago', () => {
    expect(agoText(new Date(now.getTime() - 30_000), now)).toBe('Now');
    expect(agoText(new Date(now.getTime() - 12 * 60_000), now)).toBe('12 min ago');
    expect(agoText(new Date(now.getTime() - 2 * 3_600_000), now)).toBe('2h ago');
    expect(agoText(new Date(now.getTime() - 30 * 3_600_000), now)).toBe('Yesterday');
  });

  it('groups by app, newest app first, Praxis under Theoria', () => {
    const entries: InboxEntry[] = [
      { key: 'a', kind: 'bill', at: new Date(now.getTime() - 3_600_000), title: '', body: '', open: 'oikonomia:bill:1' },
      { key: 'b', kind: 'item', at: new Date(now.getTime() - 60_000), title: '', body: '', open: 'item:1' },
      { key: 'c', kind: 'bill', at: new Date(now.getTime() - 120_000), title: '', body: '', open: 'oikonomia:bill:2' },
      { key: 'd', kind: 'study', at: new Date(now.getTime() - 7_200_000), title: '', body: '', open: 'praxis' },
    ];
    const groups = byApp(arrangeInbox(entries, now));
    expect(groups.map((group) => [group.app, group.entries.map((entry) => entry.key)])).toEqual([
      ['proairetos', ['b']],
      ['oikonomia', ['c', 'a']],
      ['theoria', ['d']],
    ]);
  });
});

describe('schedule changes', () => {
  const block = (day: string, start: string, end = '15:00') => ({ day, name: 'Work · Days', start: `${day}T${start}:00`, end: `${day}T${end}:00` });

  it('says a block moved, was added or was taken off', () => {
    const before = [block('2026-10-31', '06:30'), block('2026-11-01', '06:30')];
    const after = [block('2026-10-31', '07:00'), block('2026-11-02', '06:30')];
    const lines = scheduleChanges(before, after, now).map((entry) => entry.body);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^Work · Days on .* was moved to 7:00/);
    expect(lines[1]).toMatch(/^Work · Days added on/);
    expect(lines[2]).toMatch(/was taken off\.$/);
  });

  it('folds many changes into one line, and says nothing when nothing changed', () => {
    const before = ['01', '02', '03', '04'].map((d) => block(`2026-11-${d}`, '06:30'));
    const after = ['01', '02', '03', '04'].map((d) => block(`2026-11-${d}`, '14:30', '23:00'));
    expect(scheduleChanges(before, after, now).map((entry) => entry.body)).toEqual(['Your schedule changed on 4 days.']);
    expect(scheduleChanges(before, before, now)).toEqual([]);
  });
});

describe('milestones', () => {
  const run = (n: number, meters: number): LogEntry => ({ id: `r${n}`, date: `2026-10-${String(n).padStart(2, '0')}`, activity: 'run', meters, createdAt: `2026-10-${String(n).padStart(2, '0')}T08:00:00` });

  it('marks the first, tenth runs and a longest run from the third on', () => {
    const runs = Array.from({ length: 10 }, (_, i) => run(i + 1, i === 4 ? 8000 : 5000));
    const bodies = runMilestones(runs, 'km').map((entry) => entry.body);
    expect(bodies[0]).toBe('First run logged.');
    expect(bodies).toContain('10 runs logged.');
    expect(bodies.filter((body) => body.startsWith('8.0 km'))).toHaveLength(1);
  });

  it('marks strength sessions and a heavier set from an exercise’s third session', () => {
    const workout = (n: number, weight: number): Workout => ({ id: `w${n}`, date: `2026-10-${String(n).padStart(2, '0')}`, session: 'A', createdAt: `2026-10-${String(n).padStart(2, '0')}T08:00:00`, exercises: [{ exercise: 'back-squat', name: 'Back squat', sets: [{ weight, reps: 5 }] }] });
    const found = strengthMilestones([workout(1, 60), workout(2, 65), workout(3, 70), workout(4, 70)], 'kg');
    expect(found.map((entry) => entry.body)).toEqual(['First strength session logged.', 'Back squat 70 kg.']);
  });
});
