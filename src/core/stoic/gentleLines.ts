/**
 * Short lines for quiet, empty moments. Impermanence, self-compassion,
 * beginning again. Never a nudge to do more.
 */
export const gentleLines: readonly string[] = [
  'An empty page is also a kind of rest.',
  'Nothing here needs you right now.',
  'Begin again whenever you like. That is the practice.',
  'This moment asks nothing of you.',
  'Whatever happened before has passed. So will what comes next.',
  'Enough is often closer than it seems.',
  'Rest is part of the work.',
  'You can start small. Small counts.',
  'Quiet is not empty. It is room.',
];

/** One line for a local date, steady through the day. */
export function gentleLineFor(date: string): string {
  let hash = 7;
  for (const char of date) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return gentleLines[hash % gentleLines.length];
}
