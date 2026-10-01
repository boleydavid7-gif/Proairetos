/** A plain hello for the top of Today, by the clock only. Overnight it stays neutral. */
export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return 'Hello';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
