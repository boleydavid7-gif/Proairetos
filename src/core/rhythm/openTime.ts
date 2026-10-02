import { addDays, atTime, toLocalDate } from '../scheduling/dates';
import type { QuietHours } from './quietHours';

export type Span = { start: Date; end: Date };

/** A scheduled item has no length; it holds this much of the day. */
export const ITEM_MINUTES = 30;
/** Shorter gaps are not shown. */
export const MIN_OPEN_MINUTES = 30;

/** The quiet windows (the person's own rest hours) that touch a span. */
function quietSpans(range: Span, quiet: QuietHours): Span[] {
  if (!quiet.on || quiet.start === quiet.end) return [];
  const spans: Span[] = [];
  const first = addDays(toLocalDate(range.start), -1);
  for (let day = first; atTime(day, '00:00') < range.end; day = addDays(day, 1)) {
    const start = atTime(day, quiet.start);
    const end = atTime(quiet.end > quiet.start ? day : addDays(day, 1), quiet.end);
    spans.push({ start, end });
  }
  return spans;
}

/**
 * The open stretches of a day: what is left between `from` and the end of
 * the day after commitments, protected time, calendar events, set times,
 * and the person's quiet hours. Facts about the clock, nothing more; what
 * goes in them is the person's choice.
 */
export function openStretches(range: Span, from: Date, busy: readonly Span[], quiet: QuietHours): Span[] {
  const start = new Date(Math.max(range.start.getTime(), from.getTime()));
  if (start >= range.end) return [];
  const taken = [...busy, ...quietSpans(range, quiet)]
    .filter((span) => span.end > start && span.start < range.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const open: Span[] = [];
  let cursor = start;
  for (const span of taken) {
    if (span.start > cursor) open.push({ start: cursor, end: span.start });
    if (span.end > cursor) cursor = span.end;
  }
  if (cursor < range.end) open.push({ start: cursor, end: range.end });
  return open
    .map((span) => ({ start: roundUp(span.start), end: span.end }))
    .filter((span) => span.end.getTime() - span.start.getTime() >= MIN_OPEN_MINUTES * 60_000);
}

/** To the next quarter hour, so a stretch reads "10:15", not "10:07". */
function roundUp(date: Date): Date {
  const quarter = 15 * 60_000;
  return new Date(Math.ceil(date.getTime() / quarter) * quarter);
}

/** The time an item holds: to its end if it has one, else ITEM_MINUTES. */
export function itemSpan(scheduledAt: string, endsAt?: string): Span {
  const start = new Date(scheduledAt);
  const end = endsAt && new Date(endsAt) > start ? new Date(endsAt) : new Date(start.getTime() + ITEM_MINUTES * 60_000);
  return { start, end };
}
