import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';

export const revisitChoices = [
  { id: 'none', label: 'No need' },
  { id: 'week', label: 'In a week', days: 7 },
  { id: 'month', label: 'In a month', days: 30 },
  { id: 'date', label: 'Pick a date' },
] as const;

export type RevisitChoice = (typeof revisitChoices)[number]['id'];

/** Local midnight of the chosen day, as ISO. */
export function revisitDate(choice: RevisitChoice, pickedDate: string, today = new Date()): string | undefined {
  if (choice === 'none') return undefined;
  if (choice === 'date') return pickedDate ? atTime(pickedDate, '00:00').toISOString() : undefined;
  const days = choice === 'week' ? 7 : 30;
  return atTime(addDays(toLocalDate(today), days), '00:00').toISOString();
}
