/*
 * When to go: what the weather was at a place over the past twelve months, month by month, as recorded (Open-Meteo's
 * archive of ERA5). Facts about last year, not a forecast and not advice.
 */

export type DayRecord = { date: string; high: number; low: number; rain?: number };
export type MonthWeather = { month: number; high: number; low: number; rainyDays: number; days: number };

/** A day with at least 1 mm of rain or snow counts as a rainy day, as weather services count them. */
export const RAINY_MM = 1;

/** The twelve months January to December, each with its average high and low and its rainy days; months without days left out. */
export function monthsOf(days: readonly DayRecord[]): MonthWeather[] {
  const by = new Map<number, DayRecord[]>();
  for (const day of days) {
    if (!Number.isFinite(day.high) || !Number.isFinite(day.low)) continue;
    const month = Number(day.date.slice(5, 7));
    by.set(month, [...(by.get(month) ?? []), day]);
  }
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month, list]) => ({
      month,
      high: average(list.map((day) => day.high)),
      low: average(list.map((day) => day.low)),
      rainyDays: Math.round((list.filter((day) => (day.rain ?? 0) >= RAINY_MM).length / list.length) * 30),
      days: list.length,
    }));
}

/** The twelve whole months before this one: from the first of the month a year back to the last day of last month. */
export function pastYearRange(today: string): { from: string; until: string } {
  const [y, m] = today.split('-').map(Number);
  const from = `${y - 1}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, m - 1, 0));
  return { from, until: last.toISOString().slice(0, 10) };
}

/** The months a trip's dates touch, for marking them. */
export function monthsTouched(start?: string, end?: string): Set<number> {
  const out = new Set<number>();
  if (!start) return out;
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = (end && end >= start ? end : start).split('-').map(Number);
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? ((m = 1), (y += 1)) : (m += 1)) {
    out.add(m);
    if (out.size === 12) break;
  }
  return out;
}
