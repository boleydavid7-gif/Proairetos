import { describe, expect, it } from 'vitest';
import { dateFact, minutesByDay, newSubject, openHoursBefore, rhythmLeft, untilText, upcomingDates, weekOf, workFact, type StudySession, type Subject } from '../../melete/core/subjects';

const subject = (extra: Partial<Subject> = {}): Subject => ({ ...newSubject('s1', 'Biology', new Date('2026-11-01T12:00:00Z')), ...extra });

describe('dates as facts', () => {
  it('says how far a date is, and nothing once it has passed', () => {
    expect(untilText('2026-11-05', '2026-11-05')).toBe('today');
    expect(untilText('2026-11-06', '2026-11-05')).toBe('tomorrow');
    expect(untilText('2026-11-17', '2026-11-05')).toBe('in 12 days');
    expect(untilText('2026-11-04', '2026-11-05')).toBe('');
    expect(untilText('2027-03-04', '2026-11-05')).toBe('Mar 4');
  });

  it('writes a date by its kind', () => {
    expect(dateFact({ id: 'a', title: '', kind: 'exam', date: '2026-11-17' }, '2026-11-05')).toBe('Exam in 12 days');
    expect(dateFact({ id: 'a', title: 'Chapter 3', kind: 'due', date: '2026-11-06' }, '2026-11-05')).toBe('Chapter 3 due tomorrow');
    expect(dateFact({ id: 'a', title: '', kind: 'due', date: '2027-03-04' }, '2026-11-05')).toBe('Due on Mar 4');
    expect(dateFact({ id: 'a', title: '', kind: 'exam', date: '2026-10-01' }, '2026-11-05')).toBe('');
  });

  it('lists what is coming, soonest first', () => {
    const a = subject({ dates: [{ id: 'd1', title: '', kind: 'exam', date: '2026-12-01' }, { id: 'd0', title: 'Quiz', kind: 'other', date: '2026-11-06' }] });
    const b = subject({ id: 's2', name: 'Spanish', dates: [{ id: 'd2', title: '', kind: 'due', date: '2026-11-20' }, { id: 'old', title: '', kind: 'due', date: '2026-10-01' }] });
    expect(upcomingDates([a, b], '2026-11-05').map((each) => each.date.id)).toEqual(['d0', 'd2', 'd1']);
    expect(upcomingDates([a, b], '2026-11-05', 20).map((each) => each.date.id)).toEqual(['d0', 'd2']);
  });
});

describe('hours as facts', () => {
  it('counts open hours between two moments', () => {
    const open = [{ start: new Date('2026-11-05T09:00:00'), end: new Date('2026-11-05T11:00:00') }, { start: new Date('2026-11-06T09:00:00'), end: new Date('2026-11-06T10:30:00') }];
    expect(openHoursBefore(open, new Date('2026-11-05T00:00:00'), new Date('2026-11-07T00:00:00'))).toBe(3.5);
    expect(openHoursBefore(open, new Date('2026-11-05T10:00:00'), new Date('2026-11-06T09:30:00'))).toBe(1.5);
  });

  it('speaks only when the person gave an estimate', () => {
    const entry = { id: 'a', title: '', kind: 'exam' as const, date: '2026-11-13', hours: 9 };
    expect(workFact(entry, 6)).toBe('About 9 h of work, 6 h open before Fri');
    expect(workFact({ ...entry, hours: undefined }, 6)).toBeUndefined();
  });
});

describe('sessions', () => {
  const at = (day: string, hour: number, extra: Partial<StudySession> = {}): StudySession => ({ id: `${day}${hour}`, subjectId: 's1', kind: 'read', start: new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).toISOString(), minutes: 30, ...extra });

  it('leaves the rhythm chips for what is not yet set this week', () => {
    const s = subject({ rhythm: { times: 3, minutes: 45 } });
    expect(rhythmLeft(s, [], '2026-11-02')).toBe(3);
    expect(rhythmLeft(s, [at('2026-11-03', 9), at('2026-11-04', 9)], '2026-11-02')).toBe(1);
    expect(rhythmLeft(s, [at('2026-11-10', 9)], '2026-11-02')).toBe(3);
    expect(rhythmLeft(subject(), [], '2026-11-02')).toBe(0);
  });

  it('counts minutes on the day a sitting was done', () => {
    const done = [at('2026-11-03', 9, { doneAt: new Date('2026-11-03T09:40:00').toISOString(), minutes: 40 }), at('2026-11-03', 15, { doneAt: new Date('2026-11-03T15:20:00').toISOString(), minutes: 20 }), at('2026-11-04', 9)];
    expect(minutesByDay(done, ['2026-11-03', '2026-11-04'])).toEqual([60, 0]);
  });

  it('finds the week from any day', () => {
    expect(weekOf('2026-11-05')[0]).toBe('2026-11-02');
    expect(weekOf('2026-11-05')).toHaveLength(7);
  });
});
