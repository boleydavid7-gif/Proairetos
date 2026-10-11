/**
 * A year in an app, as plain facts: how many, how much, and the lines the person wrote. Nothing compared, ranked
 * against a target or read into; a fact with nothing behind it is left out.
 */

export type YearFact = { label: string; value: string };
export type YearList = { title: string; lines: string[] };
export type Year = { facts: YearFact[]; lists: YearList[] };

/** Whether a local date ("YYYY-MM-DD", or an ISO time) falls in the year. */
export const inYear = (date: string | undefined, year: number): boolean => Boolean(date) && date!.slice(0, 4) === String(year);

/** The years that hold any of these dates, newest first, always with this year. */
export function yearsOf(dates: readonly (string | undefined)[], thisYear: number): number[] {
  const years = new Set<number>([thisYear]);
  for (const date of dates) {
    const year = Number(date?.slice(0, 4));
    if (year > 1900 && year <= thisYear) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

/** "45 min", "3 h", "12 h 30 min". */
export function durationText(minutes: number): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export const countText = (n: number) => n.toLocaleString();

/** Keeps a fact only when it has something behind it. */
export function facts(...pairs: [label: string, value: string | undefined | false][]): YearFact[] {
  return pairs.filter((pair): pair is [string, string] => Boolean(pair[1])).map(([label, value]) => ({ label, value }));
}

/** "Mar 3", for lines within the year. */
export function shortDay(date: string): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
