import type { Span } from '../../core/rhythm/openTime';
import { addDays, mondayOnOrBefore, parseLocalDate, toLocalDate } from '../../core/scheduling/dates';

/*
 * What the person is learning, in their own words: a class, a certification, a language, a skill taught to oneself.
 * Every part but the name is optional. The app holds dates and sessions and works out the clock facts (days until a
 * date, hours open in the week); it never chooses what to study or how much.
 */

export type DateKind = 'exam' | 'due' | 'other';
export const DATE_KINDS: readonly { id: DateKind; label: string }[] = [
  { id: 'exam', label: 'Exam' },
  { id: 'due', label: 'Due' },
  { id: 'other', label: 'Date' },
];

/** A date the person set. `hours` is their own estimate of the work, when they chose to give one. */
export type SubjectDate = { id: string; title: string; date: string; kind: DateKind; hours?: number };
export type Material = { id: string; title: string; url?: string };
export type Subject = {
  id: string;
  name: string;
  color?: string;
  dates: SubjectDate[];
  /** The person's own rhythm: this many sessions a week, this long. Offered as loose chips on the week, never a quota. */
  rhythm?: { times: number; minutes: number };
  /** "When I ..., I'll ..." in the person's words. */
  ifThen?: string;
  materials: Material[];
  createdAt: string;
};

export type SessionKind = 'read' | 'practice' | 'recall' | 'explain' | 'review';
/** The kinds of sitting; the person picks one. Practice testing and spacing rate highest in the research (Dunlosky et al. 2013). */
export const SESSION_KINDS: readonly { id: SessionKind; label: string }[] = [
  { id: 'read', label: 'Read' },
  { id: 'practice', label: 'Practice' },
  { id: 'recall', label: 'Recall' },
  { id: 'explain', label: 'Explain' },
  { id: 'review', label: 'Review' },
];
export const KINDS_SOURCE = 'Dunlosky et al. (2013): practice testing and spaced practice rate highest; explaining and mixing subjects moderate.';

/** A sitting: set for a time (`start`), and once it has been done, `doneAt` and the minutes actually kept. */
export type StudySession = { id: string; subjectId?: string; kind: SessionKind; start: string; minutes: number; doneAt?: string; line?: string };

export const SUBJECT_COLORS = ['amber', 'violet', 'sage', 'sky', 'rose', 'slate'] as const;

export function newSubject(id: string, name: string, now = new Date()): Subject {
  return { id, name: name.trim(), dates: [], materials: [], createdAt: now.toISOString() };
}

// ---------- Dates, as facts ----------

const dayDistance = (date: string, today: string) => Math.round((parseLocalDate(date).getTime() - parseLocalDate(today).getTime()) / 86_400_000);

/** "today", "tomorrow", "in 12 days"; later than 60 days it is the date itself. Nothing for a date that has passed. */
export function untilText(date: string, today: string): string {
  const days = dayDistance(date, today);
  if (days < 0) return '';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 60) return `in ${days} days`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parseLocalDate(date));
}

export const kindLabel = (kind: DateKind) => DATE_KINDS.find((each) => each.id === kind)?.label ?? 'Date';

/** "Exam in 12 days", "Chapter 3 due tomorrow", "Date on Mar 4". */
export function dateFact(entry: SubjectDate, today: string): string {
  const when = untilText(entry.date, today);
  if (!when) return '';
  const near = when === 'today' || when === 'tomorrow' || when.startsWith('in ');
  const at = near ? when : `on ${when}`;
  const title = entry.title.trim();
  if (entry.kind === 'due') return title ? `${title} due ${at}` : `Due ${at}`;
  if (entry.kind === 'exam') return `${title || 'Exam'} ${at}`;
  return `${title || 'Date'} ${at}`;
}

export type Upcoming = { subject: Subject; date: SubjectDate };

/** Every date still to come (today included), soonest first. */
export function upcomingDates(subjects: readonly Subject[], today: string, within?: number): Upcoming[] {
  return subjects
    .flatMap((subject) => subject.dates.map((date) => ({ subject, date })))
    .filter(({ date }) => dayDistance(date.date, today) >= 0 && (within === undefined || dayDistance(date.date, today) <= within))
    .sort((a, b) => a.date.date.localeCompare(b.date.date) || a.subject.name.localeCompare(b.subject.name));
}

// ---------- Hours, as facts ----------

const hoursWord = (hours: number) => {
  const rounded = Math.round(hours * 2) / 2;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} h`;
}

/** The open hours (spans) between two moments. */
export function openHoursBefore(open: readonly Span[], from: Date, until: Date): number {
  let minutes = 0;
  for (const span of open) {
    const start = Math.max(span.start.getTime(), from.getTime());
    const end = Math.min(span.end.getTime(), until.getTime());
    if (end > start) minutes += (end - start) / 60_000;
  }
  return minutes / 60;
}

/**
 * Only when the person gave an estimate: "About 9 h of work, 6 h open before Fri". A plain comparison of two numbers;
 * it says nothing about what to do with them.
 */
export function workFact(entry: SubjectDate, openHours: number): string | undefined {
  if (!entry.hours || entry.hours <= 0) return undefined;
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(parseLocalDate(entry.date));
  return `About ${hoursWord(entry.hours)} of work, ${hoursWord(openHours)} open before ${weekday}`;
}

// ---------- Sessions ----------

export const sessionEnd = (session: StudySession) => new Date(new Date(session.start).getTime() + session.minutes * 60_000);

/** The person's own rhythm for the week, less what is already set or done: how many loose chips remain. Gone with the week. */
export function rhythmLeft(subject: Subject, sessions: readonly StudySession[], monday: string): number {
  if (!subject.rhythm) return 0;
  const from = parseLocalDate(monday).getTime();
  const until = parseLocalDate(addDays(monday, 7)).getTime();
  const used = sessions.filter((session) => session.subjectId === subject.id && new Date(session.start).getTime() >= from && new Date(session.start).getTime() < until).length;
  return Math.max(0, subject.rhythm.times - used);
}

/** Minutes studied on each of the given days (a session counts on the day it was done). Facts only. */
export function minutesByDay(sessions: readonly StudySession[], days: readonly string[]): number[] {
  return days.map((day) => sessions.filter((session) => session.doneAt && toLocalDate(new Date(session.doneAt)) === day).reduce((total, session) => total + session.minutes, 0));
}

export const sessionsOnDay = (sessions: readonly StudySession[], day: string) =>
  sessions.filter((session) => toLocalDate(new Date(session.start)) === day).sort((a, b) => a.start.localeCompare(b.start));

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** The seven days (Monday first) of the week holding `day`. */
export const weekOf = (day: string): string[] => {
  const monday = mondayOnOrBefore(day);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
};
