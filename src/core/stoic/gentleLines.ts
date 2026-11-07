/** A short Stoic line, credited, under an empty page. Never a nudge to do more. */
export const gentleLines: readonly string[] = [
  'Begin at once to live. — Seneca, Letters 101',
  'We suffer more often in imagination than in reality. — Seneca, Letters 13',
  'Very little is needed to make a happy life. — Marcus Aurelius, Meditations 7.67',
  'Our life is what our thoughts make it. — Marcus Aurelius, Meditations 4.3',
  'Wherever there is a human being, there is an opportunity for kindness. — Seneca, On the Happy Life 24',
  'First say to yourself what you would be; then do what you have to do. — Epictetus, Discourses 3.23',
  'Life is long if you know how to use it. — Seneca, On the Shortness of Life 2',
]

/** One line for a local date, steady through the day. */
export function gentleLineFor(date: string): string {
  let hash = 7;
  for (const char of date) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return gentleLines[hash % gentleLines.length];
}
