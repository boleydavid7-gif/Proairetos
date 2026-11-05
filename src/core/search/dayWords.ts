/**
 * "Today", "Yesterday" or a short date for a calendar day written as `YYYY-MM-DD`, in the person's own calendar.
 * A date-only value has no time zone, so it is read as that day wherever the device is (`new Date('2026-10-20')` reads it
 * as midnight UTC, which is the evening before in the Americas).
 */
export function dayWords(date: string, today: string): string {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  const [thisYear, thisMonth, thisDay] = today.slice(0, 10).split('-').map(Number);
  const days = Math.round((Date.UTC(thisYear, thisMonth - 1, thisDay) - Date.UTC(year, month - 1, day)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
