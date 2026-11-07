export type ReflectPeriod = 'today' | 'week' | 'month';

export type PeriodRange = {
  start: Date;
  end: Date;
};

/**
 * Calendar range for a period in the person's local time. The end is
 * exclusive. Weeks start on Monday unless told otherwise (0 = Sunday).
 */
export function periodRange(period: ReflectPeriod, now: Date, weekStartsOn = 1): PeriodRange {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'today') {
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1) };
  }

  if (period === 'week') {
    const offset = (start.getDay() - weekStartsOn + 7) % 7;
    start.setDate(start.getDate() - offset);
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) };
  }

  start.setDate(1);
  return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
}

export function isWithin(iso: string, range: PeriodRange): boolean {
  const time = new Date(iso).getTime();
  return time >= range.start.getTime() && time < range.end.getTime();
}
