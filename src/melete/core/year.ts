import { countText, durationText, facts, inYear, type Year } from '../../core/year/year';
import type { StudySession, Subject } from './subjects';

/** Study sessions finished in a year: the time, the days, and the time on each subject. Nothing compared. */
export function meleteYear(subjects: readonly Subject[], sessions: readonly StudySession[], year: number): Year {
  const done = sessions.filter((session) => session.doneAt && inYear(session.doneAt, year));
  const days = new Set(done.map((session) => session.doneAt!.slice(0, 10)));
  const total = done.reduce((sum, session) => sum + session.minutes, 0);
  const bySubject = subjects
    .map((subject) => ({ subject, minutes: done.filter((session) => session.subjectId === subject.id).reduce((sum, session) => sum + session.minutes, 0) }))
    .filter((each) => each.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes || a.subject.name.localeCompare(b.subject.name));
  return {
    facts: facts(
      ['Time studied', total > 0 && durationText(total)],
      ['Study sessions', done.length > 0 && countText(done.length)],
      ['Days studied', days.size > 0 && countText(days.size)],
    ),
    lists: [{ title: 'Subjects', lines: bySubject.map((each) => `${each.subject.name} · ${durationText(each.minutes)}`) }].filter((list) => list.lines.length),
  };
}

export const meleteDates = (sessions: readonly StudySession[]) => sessions.map((session) => session.doneAt);
