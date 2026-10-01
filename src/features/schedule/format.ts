import { atTime, parseLocalDate } from '../../core/scheduling/dates';
import type { TimeBlock } from '../../core/scheduling/types';

/** "6:30 AM" style, in the person's locale. */
export function formatClock(time: string): string {
  return atTime('2000-01-03', time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatBlock(block: TimeBlock): string {
  return `${formatClock(block.start)} – ${formatClock(block.end)}`;
}

export function formatLocalDay(date: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }): string {
  return parseLocalDate(date).toLocaleDateString(undefined, options);
}

export function formatTimeOf(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
