import { addDays } from '../../core/scheduling/dates';

/*
 * Time at the place and the body clock. The difference comes from the two time zones on the trip's first day; the
 * sleep shift before a long trip follows Eastman & Burgess: an hour a day for up to three days, earlier with morning
 * light before going east, later with evening light before going west. Offered, never set.
 */

export const SHIFT_SOURCE =
  'Eastman CI, Burgess HJ. How to travel the world without jet lag. Sleep Med Clin. 2009;4(2):241-255. Waterhouse J, et al. Jet lag: trends and coping strategies. Lancet. 2007;369:1117-1129.';

/** Minutes a time zone is ahead of UTC at a moment (negative west of it). */
export function offsetMinutes(timeZone: string, at: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(at);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
    return Math.round((asUtc - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
  } catch {
    return 0;
  }
}

/** Hours the place's clock is ahead of home's (negative when it is earlier there). */
export function hoursApart(home: string, there: string, at: Date): number {
  return (offsetMinutes(there, at) - offsetMinutes(home, at)) / 60;
}

const hours = (value: number) => {
  const whole = Math.abs(value);
  const text = Number.isInteger(whole) ? String(whole) : whole.toFixed(1).replace(/\.0$/, '');
  return `${text} ${whole === 1 ? 'hour' : 'hours'}`;
};

/** "5 hours later there", "3 hours earlier there", "Same time as home". */
export function apartText(apart: number): string {
  if (apart === 0) return 'Same time as home';
  return `${hours(apart)} ${apart > 0 ? 'later' : 'earlier'} there`;
}

/** The clock at a place now: "3:12 PM, Thu". */
export function clockIn(timeZone: string, now: Date): string {
  try {
    return now.toLocaleString(undefined, { timeZone, hour: 'numeric', minute: '2-digit', weekday: 'short' }).replace(/^(\w+),? (.+)$/, '$2, $1');
  } catch {
    return '';
  }
}

export type ShiftDay = { date: string; bed: string; wake: string; light: 'morning' | 'evening' };

const at = (time: string, minutes: number) => {
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Up to three days before leaving, each an hour further toward the place's clock: bed and waking earlier with bright
 * light soon after waking when the place is ahead, later with bright light in the evening when it is earlier there.
 * Only for three hours apart or more.
 */
export function sleepShift(apart: number, leaving: string, bedtime: string, sleepHours: number): ShiftDay[] {
  if (Math.abs(apart) < 3) return [];
  const days = Math.min(3, Math.floor(Math.abs(apart)));
  const way = apart > 0 ? -1 : 1;
  return Array.from({ length: days }, (_, index) => {
    const moved = way * 60 * (index + 1);
    const bed = at(bedtime, moved);
    return { date: addDays(leaving, index - days), bed, wake: at(bed, Math.round(sleepHours * 60)), light: apart > 0 ? 'morning' : 'evening' };
  });
}
