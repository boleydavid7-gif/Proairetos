/** A plain hello for the top of Today, by the clock only. Overnight it stays neutral. */
export function greeting(now: Date, name = ''): string {
  const hour = now.getHours();
  const hello = hour < 5 ? 'Hello' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name.trim() ? `${hello}, ${name.trim()}` : hello;
}
