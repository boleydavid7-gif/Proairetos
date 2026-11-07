import { watchLocal } from '../../app/family/localChanges';
import { localDayOf, rangeDays, type CalendarLine, type Provider } from '../../core/providers';
import type { StudySession, Subject } from '../core/subjects';

const DATE_WORDS: Record<string, string> = { exam: 'Exam', due: 'Due', other: 'Date' };
const open = (subject: string) => `/melete/?open=subject:${encodeURIComponent(subject)}`;

/*
 * Study sessions the person set, as entries as long as they set them, and each subject's exam, due and other dates as
 * deadlines on their day. Never materials, if-then lines or hour estimates (manifest, melete.calendar). The subject stays
 * in Meletē; a date opens it there.
 */
export const meleteCalendar: Provider<'calendar'> = {
  app: 'melete',
  capability: 'calendar',
  version: 1,
  privacy: 'own-search',
  sources: ['local:melete:subject:', 'local:melete:session:'],
  async read(ctx) {
    const range = ctx.range;
    if (!range) return [];
    const { first, last } = rangeDays(range);
    const subjects = (await ctx.records<Subject>('local:melete:subject:')).filter((subject) => typeof subject.id === 'string');
    const sessions = await ctx.records<StudySession>('local:melete:session:');
    const lines: CalendarLine[] = [];
    const names = new Map(subjects.map((subject) => [subject.id, subject.name]));
    for (const session of sessions) {
      if (typeof session?.id !== 'string') continue;
      const start = new Date(session.start);
      if (Number.isNaN(start.getTime())) continue;
      const end = new Date(start.getTime() + Math.max(1, session.minutes) * 60_000);
      if (end <= range.from || start >= range.until) continue;
      const subject = (session.subjectId && names.get(session.subjectId)) || 'Study';
      lines.push({
        ref: { app: 'melete', kind: 'session', id: session.id },
        kind: 'event',
        title: `${subject} · Study`,
        open: `/melete/?open=session:${encodeURIComponent(session.id)}`,
        day: localDayOf(start),
        start,
        end,
      });
    }
    for (const subject of subjects) {
      for (const entry of subject.dates ?? []) {
        if (typeof entry?.date !== 'string' || entry.date < first || entry.date > last) continue;
        lines.push({
          ref: { app: 'melete', kind: 'date', id: `${subject.id}:${entry.id}` },
          kind: 'deadline',
          title: `${subject.name}: ${entry.title?.trim() || (DATE_WORDS[entry.kind] ?? 'Date')}`,
          open: open(subject.id),
          day: entry.date,
          color: 'sage',
        });
      }
    }
    return lines;
  },
  subscribe: (listener) => watchLocal('melete:', listener),
};
