import { describe, expect, it } from 'vitest';
import { studyDatesOn } from '../../app/calendars/meleteCalendar';
import type { Subject } from '../../melete/core/subjects';

const subject = (id: string, name: string, dates: Subject['dates']): Subject => ({ id, name, dates, materials: [], createdAt: '2026-10-01' });

describe('study dates in Days ahead', () => {
  const subjects = [
    subject('a', 'Biology', [{ id: 'd1', title: 'Midterm', date: '2026-11-20', kind: 'exam' }, { id: 'd2', title: '', date: '2026-11-22', kind: 'due' }]),
    subject('b', 'Spanish', [{ id: 'd3', title: 'Oral', date: '2026-11-20', kind: 'other' }]),
  ];
  it('lists every subject date on its day, each opening the subject', () => {
    const lines = studyDatesOn(subjects, '2026-11-20');
    expect(lines.map((line) => line.name)).toEqual(['Biology: Midterm', 'Spanish: Oral']);
    expect(lines[0].href).toBe('/melete/?open=subject:a');
  });
  it('names a date with no title by its kind, and ignores other days', () => {
    expect(studyDatesOn(subjects, '2026-11-22').map((line) => line.name)).toEqual(['Biology: Due']);
    expect(studyDatesOn(subjects, '2026-11-21')).toEqual([]);
  });
});
