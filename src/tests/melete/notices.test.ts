import { describe, expect, it } from 'vitest';
import { studyNotices } from '../../melete/core/notices';
import type { StudySession, Subject } from '../../melete/core/subjects';

const subjects: Subject[] = [
  { id: 'a', name: 'Biology', dates: [{ id: 'd1', title: 'Midterm', date: '2026-11-10', kind: 'exam' }, { id: 'd2', title: '', date: '2026-11-04', kind: 'due' }], materials: [], createdAt: '2026-10-01' },
];
const session = (patch: Partial<StudySession>): StudySession => ({ id: 's1', subjectId: 'a', kind: 'read', start: '2026-11-06T18:00', minutes: 45, ...patch });
const now = new Date('2026-11-05T12:00');

describe('Meletē reminders', () => {
  it('says a planned session when it starts, with the subject and length', () => {
    const [notice] = studyNotices(subjects, [session({})], '2026-11-05', 14, now);
    expect(notice).toMatchObject({ kind: 'melete', title: 'Biology', body: 'Study session, 45 min.', open: 'melete:session:s1' });
    expect(notice.at).toEqual(new Date('2026-11-06T18:00'));
  });
  it('leaves out a session already done, one already begun, and one past the horizon', () => {
    const list = [session({ id: 'x', doneAt: '2026-11-06T18:45' }), session({ id: 'y', start: '2026-11-05T09:00' }), session({ id: 'z', start: '2026-12-30T09:00' })];
    expect(studyNotices([], list, '2026-11-05', 14, now)).toEqual([]);
  });
  it('says a date the morning before, and not one whose morning has passed', () => {
    const notices = studyNotices(subjects, [], '2026-11-05', 14, now);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ title: 'Biology', body: 'Midterm tomorrow.', open: 'melete:subject:a' });
    expect(notices[0].at).toEqual(new Date('2026-11-09T09:00'));
  });
  it('names a session with no subject Study', () => {
    expect(studyNotices([], [session({ subjectId: undefined })], '2026-11-05', 14, now)[0].title).toBe('Study');
  });
});
