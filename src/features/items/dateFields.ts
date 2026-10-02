import { addDays, atTime } from '../../core/scheduling/dates';

const pad = (n: number) => String(n).padStart(2, '0');

function localDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** ISO timestamp -> value for <input type="datetime-local">, in local time. */
export function toDateTimeInput(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return `${localDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** <input type="datetime-local"> value (local time) -> ISO timestamp. */
export function fromDateTimeInput(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

/** ISO timestamp -> value for <input type="date">, in local time. */
export function toDateInput(iso: string | undefined): string {
  return iso ? localDate(new Date(iso)) : '';
}

/**
 * <input type="date"> value -> ISO timestamp of local midnight. Parsing the
 * bare date would give UTC midnight, which shows as the previous day in
 * the Americas.
 */
export function fromDateInput(value: string): string | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toISOString();
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** A date -> value for <input type="time">, in local time. */
export function toTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** An end on the same day, or the next morning when it is earlier than the start (overnight). */
export function endAt(day: string, start: string, until: string): string | undefined {
  if (!until) return undefined;
  const begin = atTime(day, start);
  let finish = atTime(day, until);
  if (finish <= begin) finish = atTime(addDays(day, 1), until);
  return finish.toISOString();
}

