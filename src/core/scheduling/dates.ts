/** Local calendar dates as "YYYY-MM-DD", independent of time zone and DST. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: string, days: number): string {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return toLocalDate(date);
}

/** Whole calendar days from a to b. Uses UTC day numbers so DST never adds or loses a day. */
export function daysBetween(a: string, b: string): number {
  const dayNumber = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day) / 86_400_000;
  };
  return dayNumber(b) - dayNumber(a);
}

export function isValidLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toLocalDate(parseLocalDate(value)) === value;
}

export function isValidTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60);
}

export function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** A local date and "HH:MM" combined into a Date, honouring DST. */
export function atTime(date: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = parseLocalDate(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/** The Monday on or before a local date. Weekly patterns anchor here. */
export function mondayOnOrBefore(value: string): string {
  const weekday = parseLocalDate(value).getDay(); // 0 = Sunday
  return addDays(value, -((weekday + 6) % 7));
}
