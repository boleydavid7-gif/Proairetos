import { describe, expect, it } from 'vitest';
import type { HostContext } from '../../core/providers';
import { meleteCalendar } from '../../melete/providers/calendar';
import type { Subject } from '../../melete/core/subjects';

const subject = (id: string, name: string, dates: Subject['dates']): Subject => ({ id, name, dates, materials: [], createdAt: '2026-10-01' });
async function on(subjects: Subject[], date: string) {
  const ctx = {
    today: date,
    now: new Date(`${date}T12:00:00`),
    range: { from: new Date(`${date}T00:00:00`), until: new Date(`${date}T23:59:59`) },
    records: async <T,>(source: string) => (source === 'local:melete:subject:' ? subjects : []) as unknown as T[],
  } as unknown as HostContext;
  return meleteCalendar.read(ctx) as Promise<{ title: string; open: string; kind: string }[]>;
}

describe('study dates in Days ahead', () => {
  const subjects = [
    subject('a', 'Biology', [{ id: 'd1', title: 'Midterm', date: '2026-11-20', kind: 'exam' }, { id: 'd2', title: '', date: '2026-11-22', kind: 'due' }]),
    subject('b', 'Spanish', [{ id: 'd3', title: 'Oral', date: '2026-11-20', kind: 'other' }]),
  ];
  it('lists every subject date on its day as a deadline, each opening the subject', async () => {
    const lines = await on(subjects, '2026-11-20');
    expect(lines.map((line) => line.title)).toEqual(['Biology: Midterm', 'Spanish: Oral']);
    expect(lines.every((line) => line.kind === 'deadline')).toBe(true);
    expect(lines[0].open).toBe('/melete/?open=subject:a');
  });
  it('names a date with no title by its kind, and ignores other days', async () => {
    expect((await on(subjects, '2026-11-22')).map((line) => line.title)).toEqual(['Biology: Due']);
    expect(await on(subjects, '2026-11-21')).toEqual([]);
  });
});
