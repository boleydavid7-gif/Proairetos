import { addDays, atTime } from '../scheduling/dates';
import { openStretches, type Span } from '../rhythm/openTime';
import type { QuietHours } from '../rhythm/quietHours';

/*
 * When something new in the person's day lands on a planned run or strength session, the session can stay in the
 * day at another time, or go to another day the training week allows. These are the facts for that offer; the
 * person picks, or keeps both as they are.
 */

export type Session = {
  app: 'askesis' | 'dynamis';
  /** Askesis's workout id; Dynamis's sessions go by day. */
  id?: string;
  title: string;
  date: string;
  /** Minutes the session takes. */
  minutes: number;
  /** When it is meant to start, if the person keeps a time for it. */
  at?: Date;
};

/** Training goes in the waking day: from six in the morning to nine at night, unless quiet hours say otherwise. */
const DAY_FROM = '06:00';
const DAY_UNTIL = '21:00';
/** Room left either side of something else in the day. */
export const BUFFER_MINUTES = 15;
/**
 * Training ends at least an hour before bed: evening exercise does not harm sleep in general, but vigorous exercise
 * ending within an hour of bedtime can (Stutz, Eiholzer & Spengler, Sports Med 2019).
 */
export const BEFORE_BED_MINUTES = 60;
export const SLEEP_SOURCE = 'Stutz, Eiholzer & Spengler, Effects of evening exercise on sleep in healthy participants: a systematic review and meta-analysis (Sports Med, 2019)';

/** Time kept clear for sleep: from an hour before bed (or the wind-down, if earlier) to waking, plus naps when chosen. */
export function sleepTaken(plan: readonly { kind: string; start: Date; end?: Date }[], naps: boolean): Span[] {
  const out: Span[] = [];
  for (const entry of plan) {
    if (!entry.end) continue;
    if (entry.kind === 'sleep') out.push({ start: new Date(entry.start.getTime() - BEFORE_BED_MINUTES * 60_000), end: entry.end });
    else if (entry.kind === 'wind-down' || (naps && entry.kind === 'nap')) out.push({ start: entry.start, end: entry.end });
  }
  return out;
}

/** Without a sleep plan: the hour before quiet hours begin, each day around `date`. */
export function beforeQuiet(date: string, quiet: QuietHours): Span[] {
  if (!quiet.on || quiet.start === quiet.end) return [];
  return [addDays(date, -1), date].map((day) => {
    const start = atTime(day, quiet.start);
    return { start: new Date(start.getTime() - BEFORE_BED_MINUTES * 60_000), end: start };
  });
}

const overlap = (a: Span, b: Span) => a.start < b.end && b.start < a.end;
const widened = (span: Span) => ({ start: new Date(span.start.getTime() - BUFFER_MINUTES * 60_000), end: new Date(span.end.getTime() + BUFFER_MINUTES * 60_000) });

/** The session's own time in the day, when it has one. */
export function sessionSpan(session: Session): Span | undefined {
  return session.at && { start: session.at, end: new Date(session.at.getTime() + session.minutes * 60_000) };
}

/** Starting times in the day that hold the whole session clear of everything else, nearest to `near` first. */
export function timesThatFit(session: Session, busy: readonly Span[], quiet: QuietHours, now: Date, near?: Date): Date[] {
  const range = { start: atTime(session.date, DAY_FROM), end: atTime(session.date, DAY_UNTIL) };
  const length = session.minutes * 60_000;
  const starts: Date[] = [];
  for (const stretch of openStretches(range, now, busy.map(widened), quiet)) {
    if (stretch.end.getTime() - stretch.start.getTime() < length) continue;
    starts.push(stretch.start);
    const latest = new Date(Math.floor((stretch.end.getTime() - length) / (15 * 60_000)) * 15 * 60_000);
    if (latest > stretch.start) starts.push(latest);
  }
  const target = (near ?? atTime(session.date, '12:00')).getTime();
  return starts.sort((a, b) => Math.abs(a.getTime() - target) - Math.abs(b.getTime() - target));
}

/**
 * Does the new span crowd the session out? With a time: the two overlap (with a little room). Without one: once the
 * new span is in, no stretch of the waking day is long enough for the session.
 */
export function crowds(session: Session, added: Span, busy: readonly Span[], quiet: QuietHours, now: Date): boolean {
  const own = sessionSpan(session);
  if (own) return overlap(widened(added), own);
  const dayStart = atTime(session.date, '00:00');
  if (!overlap(added, { start: dayStart, end: atTime(addDays(session.date, 1), '00:00') })) return false;
  return timesThatFit(session, busy, quiet, now).length > 0 && timesThatFit(session, [...busy, added], quiet, now).length === 0;
}
