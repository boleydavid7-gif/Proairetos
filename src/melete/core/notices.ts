import type { Notice } from '../../core/notify/notices';
import { addDays, atTime } from '../../core/scheduling/dates';
import type { StudySession, Subject } from './subjects';

/*
 * Meletē's reminders, off until the person turns them on in Settings > Notifications. A study session they set is
 * said when it starts; a subject's exam or due date is said once, the morning before. Nothing is said for a session
 * already done or a day already past, and nothing is made up: every line comes from what the person entered.
 */

const MORNING = '09:00';
const DATE_WORDS: Record<string, string> = { exam: 'Exam', due: 'Due', other: 'Date' };

export function studyNotices(subjects: readonly Subject[], sessions: readonly StudySession[], today: string, horizon: number, now: Date): Notice[] {
  const notices: Notice[] = [];
  const names = new Map(subjects.map((subject) => [subject.id, subject.name]));
  const until = atTime(addDays(today, horizon), '00:00');

  for (const session of sessions) {
    if (session.doneAt) continue;
    const at = new Date(session.start);
    if (Number.isNaN(at.getTime()) || at <= now || at >= until) continue;
    notices.push({
      key: `melete:session:${session.id}:${session.start}`,
      kind: 'melete',
      at,
      title: (session.subjectId && names.get(session.subjectId)) || 'Study',
      body: `Study session, ${session.minutes} min.`,
      open: `melete:session:${session.id}`,
    });
  }

  for (const subject of subjects) {
    for (const entry of subject.dates ?? []) {
      const day = addDays(entry.date, -1);
      if (day < today || day >= addDays(today, horizon)) continue;
      const at = atTime(day, MORNING);
      if (at <= now) continue;
      notices.push({
        key: `melete:date:${subject.id}:${entry.id}:${entry.date}`,
        kind: 'melete',
        at,
        title: subject.name,
        body: `${entry.title?.trim() || DATE_WORDS[entry.kind] || 'Date'} tomorrow.`,
        open: `melete:subject:${subject.id}`,
      });
    }
  }
  return notices;
}
