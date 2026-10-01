import { addDays, atTime, daysBetween, parseLocalDate, toLocalDate } from '../scheduling/dates';

/**
 * How a routine repeats. Weekdays are 0 = Monday ... 6 = Sunday.
 * The time of day comes from the item's scheduled time.
 */
export type RepeatRule =
  | { kind: 'EVERY_N_DAYS'; interval: number }
  | { kind: 'WEEKDAYS'; days: number[] };

export const repeatPresets: { id: string; label: string; rule: RepeatRule }[] = [
  { id: 'daily', label: 'Every day', rule: { kind: 'EVERY_N_DAYS', interval: 1 } },
  { id: 'weekdays', label: 'Weekdays', rule: { kind: 'WEEKDAYS', days: [0, 1, 2, 3, 4] } },
  { id: 'weekly', label: 'Every week', rule: { kind: 'EVERY_N_DAYS', interval: 7 } },
];

export function isValidRule(rule: RepeatRule): boolean {
  if (rule.kind === 'EVERY_N_DAYS') return Number.isInteger(rule.interval) && rule.interval >= 1 && rule.interval <= 365;
  return rule.days.length > 0 && rule.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
}

const mondayIndex = (date: string) => (parseLocalDate(date).getDay() + 6) % 7;
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function occurs(rule: RepeatRule, anchorDate: string, date: string): boolean {
  if (date < anchorDate) return false;
  if (rule.kind === 'EVERY_N_DAYS') return daysBetween(anchorDate, date) % rule.interval === 0;
  return rule.days.includes(mondayIndex(date));
}

/** The first occurrence on or after a local date, at the routine's time of day. */
export function occurrenceOnOrAfter(rule: RepeatRule, scheduledAt: string, date: string): string {
  const anchor = toLocalDate(new Date(scheduledAt));
  let day = date < anchor ? anchor : date;
  for (let i = 0; i < 400 && !occurs(rule, anchor, day); i++) day = addDays(day, 1);
  return atTime(day, timeOf(scheduledAt)).toISOString();
}

/** The next occurrence strictly after the one at scheduledAt. */
export function nextOccurrence(rule: RepeatRule, scheduledAt: string): string {
  return occurrenceOnOrAfter(rule, scheduledAt, addDays(toLocalDate(new Date(scheduledAt)), 1));
}

export function describeRule(rule: RepeatRule): string {
  if (rule.kind === 'EVERY_N_DAYS') {
    if (rule.interval === 1) return 'Every day';
    if (rule.interval === 7) return 'Every week';
    return `Every ${rule.interval} days`;
  }
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const sorted = [...rule.days].sort();
  if (sorted.join() === '0,1,2,3,4') return 'Weekdays';
  if (sorted.length === 7) return 'Every day';
  return sorted.map((d) => names[d]).join(', ');
}
