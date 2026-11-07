import { daysBetween, parseLocalDate } from '../scheduling/dates';

/**
 * How Today words a day on a line from another app: "Today", "Since yesterday", "Since Tue", "Since 12 Oct", "Tomorrow",
 * "Fri", "12 Oct". It is the wording Phyton wrote and every app's line on Today has used, kept as it was (a test holds it
 * to Phyton's own `dayText`). A day that came reads "Since", never late.
 */
export function homeDayText(date: string, today: string): string {
  const days = daysBetween(today, date);
  if (days === 0) return 'Today';
  if (days < 0) return days === -1 ? 'Since yesterday' : `Since ${parseLocalDate(date).toLocaleDateString(undefined, days > -7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' })}`;
  if (days === 1) return 'Tomorrow';
  if (days < 7) return parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'short' });
  return parseLocalDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** The same, with nothing for today (a line that is due today does not say so). */
export const sinceText = (text: string) => (text === 'Today' ? '' : text);

const pad2 = (n: number) => String(n).padStart(2, '0');
const dayOf = (value: Date) => `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
/** The local calendar day a time falls on. */
export const localDayOf = dayOf;

/** The first and last local calendar day a range touches (`until` is exclusive, so a range ending at midnight stops the day before). */
export function rangeDays(range: { from: Date; until: Date }): { first: string; last: string } {
  return { first: dayOf(range.from), last: dayOf(new Date(Math.max(range.from.getTime(), range.until.getTime() - 1))) };
}
