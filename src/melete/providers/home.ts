import { watchLocal } from '../../app/family/localChanges';
import type { Provider } from '../../core/providers';
import { daysBetween } from '../../core/scheduling/dates';
import type { StudySession, Subject } from '../core/subjects';

/*
 * One line on study: minutes studied today, else the next session set, with the nearest date within a week. Subject
 * names, a date's title and times; never materials, if-then lines or hours estimates (manifest, melete.home).
 */
export const meleteHome: Provider<'home'> = {
  app: 'melete',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['local:melete:subject:', 'local:melete:session:'],
  async read(ctx) {
    const subjects = (await ctx.records<Subject>('local:melete:subject:')).filter((subject) => typeof subject.id === 'string');
    const sessions = (await ctx.records<StudySession>('local:melete:session:')).filter((session) => typeof session.id === 'string');
    const range = ctx.day ?? { start: new Date(`${ctx.today}T00:00:00`), end: new Date(`${ctx.today}T23:59:59`) };
    // The nearest date a subject has within a week, as a plain fact ("Biology: Midterm in 3 days").
    const found = subjects
      .flatMap((subject) => (subject.dates ?? []).map((entry) => ({ subject, entry, away: daysBetween(ctx.today, entry.date) })))
      .filter((each) => each.away >= 0 && each.away <= 7)
      .sort((a, b) => a.away - b.away)[0];
    const soon = found ? `${found.subject.name}: ${found.entry.title?.trim() || 'Date'} ${found.away === 0 ? 'today' : found.away === 1 ? 'tomorrow' : `in ${found.away} days`}` : '';
    const withSoon = (text: string) => (soon ? `${text} · ${soon}` : text);
    const mine = sessions.filter((session) => {
      const at = new Date(session.start);
      return at >= range.start && at < range.end;
    });
    const done = mine.filter((session) => session.doneAt).reduce((total, session) => total + session.minutes, 0);
    let detail: string;
    if (done) detail = withSoon(`${done} min studied today`);
    else {
      const next = mine.filter((session) => new Date(session.start) >= ctx.now).sort((a, b) => a.start.localeCompare(b.start))[0];
      if (!next) detail = subjects.length ? withSoon('No study sessions today') : 'Add a subject';
      else detail = withSoon(`${subjects.find((subject) => subject.id === next.subjectId)?.name ?? 'Study'} · ${new Date(next.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`);
    }
    return [{ ref: { app: 'melete', kind: 'practice', id: 'today' }, group: 'practice', detail, open: '/melete/' }];
  },
  subscribe(listener) {
    const offs = ['melete:subject:', 'melete:session:'].map((prefix) => watchLocal(prefix, listener));
    return () => offs.forEach((off) => off());
  },
  // "The next session" is by the clock.
  maxAgeMs: 60_000,
};
