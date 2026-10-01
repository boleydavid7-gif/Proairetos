/** "Today", "Yesterday", or a short date, in the person's local time. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Daytime or evening, from the clock only. Nothing is read from the text. */
export function isDaytime(iso: string): boolean {
  const hour = new Date(iso).getHours();
  return hour >= 5 && hour < 18;
}
