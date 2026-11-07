import { APPS } from '../../core/apps/manifest';
import { refKey, type CalendarLine } from '../../core/providers';
import type { CalendarEvent } from '../calendars/otherCalendars';

/*
 * The shapes the calendar's screens already draw, made from the apps' calendar lines: timed entries and all-day spans
 * for the timeline and the week, and quiet lines under a day. The lines stay where the providers made them; nothing here
 * is kept.
 */

const nameOf = (app: string) => APPS.find((each) => each.id === app)?.name ?? app;
/** The order the screens always drew them in: trips and bookings, people, visits, study. */
const EVENT_ORDER = ['poreia', 'philia', 'therapeia', 'melete'];
/** And the quiet lines under a day: bills, people, things, study. */
const QUIET_ORDER = ['oikonomia', 'philia', 'ktema', 'melete'];
const rank = (order: readonly string[], app: string) => (order.includes(app) ? order.indexOf(app) : order.length);

/** Timed lines become entries at their times; a span of days becomes an all-day entry that ends the day after its last day. */
export function eventsFromLines(lines: readonly CalendarLine[], keep: (app: string) => boolean = () => true): CalendarEvent[] {
  return lines
    .filter((line) => keep(line.ref.app) && ((line.kind === 'event' && line.start && line.end) || (line.kind === 'info' && line.until)))
    .map((line, index) => ({ line, index }))
    .sort((a, b) => rank(EVENT_ORDER, a.line.ref.app) - rank(EVENT_ORDER, b.line.ref.app) || a.index - b.index)
    .map(({ line }): CalendarEvent => {
      const common = { key: refKey(line.ref), title: line.title, ...(line.location ? { location: line.location } : {}), source: nameOf(line.ref.app), sourceId: line.ref.app, open: line.open };
      if (line.kind === 'event') return { ...common, start: line.start!, end: line.end! };
      const start = new Date(`${line.day}T00:00:00`);
      const end = new Date(`${line.until}T00:00:00`);
      return { ...common, start, end: end > start ? end : new Date(start.getTime() + 86_400_000), allDay: { from: line.day, until: line.until! } };
    });
}

/** An entry an app owns: the calendar opens it in that app and never offers to delete it. Imported calendars' events have no `open`. */
export const isAppOwned = (event: { open?: string }): boolean => Boolean(event.open);

/** A deadline or a date that comes round, drawn as a quiet line. `word` is the muted word after its name, when one adds something. */
export type QuietLine = { id: string; name: string; kind: 'deadline' | 'recurring' | 'info'; word?: string; paid?: boolean; href: string; color: string };

/**
 * The word after a name: "Due" on a deadline that is not met, "Every year" on a date that comes round. Nothing is added
 * where the name already says it ("Dishwasher: warranty ends", "Biology: Due"), and a met deadline says Paid at its end instead.
 */
export function quietWord(line: Pick<CalendarLine, 'kind' | 'title' | 'done'>): string | undefined {
  if (line.kind === 'recurring') return 'Every year';
  if (line.kind === 'deadline' && !line.done && !/\b(ends|due)$/i.test(line.title.trim())) return 'Due';
  return undefined;
}

/** Deadlines and dates that come round, grouped by their day. */
export function quietLinesByDay(lines: readonly CalendarLine[]): Map<string, QuietLine[]> {
  const out = new Map<string, QuietLine[]>();
  const quiet = lines
    .filter((line) => line.kind === 'deadline' || line.kind === 'recurring' || (line.kind === 'info' && !line.until))
    .map((line, index) => ({ line, index }))
    .sort((a, b) => rank(QUIET_ORDER, a.line.ref.app) - rank(QUIET_ORDER, b.line.ref.app) || a.index - b.index);
  for (const { line } of quiet) {
    const list = out.get(line.day) ?? [];
    const word = quietWord(line);
    list.push({ id: refKey(line.ref), name: line.title, kind: line.kind as QuietLine['kind'], ...(word ? { word } : {}), ...(line.done ? { paid: true } : {}), href: line.open, color: line.color ?? 'slate' });
    out.set(line.day, list);
  }
  return out;
}
