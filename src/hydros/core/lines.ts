/**
 * Short Hydros lines shaped by Stoic writing on moderation and care of the body.
 * "After" keeps the wording honest where the line is an adaptation rather than
 * a verbatim translation.
 */
export type HydrosLine = { text: string; source: string };

export const hydrosLines: readonly HydrosLine[] = [
  {
    text: 'The body is to be trained along with the mind, for it is the instrument the mind uses.',
    source: 'After Musonius Rufus, Lecture 6',
  },
  {
    text: 'Water is enough for the body; moderation is enough for the mind.',
    source: 'After Musonius Rufus, Lecture 18A',
  },
  {
    text: 'Give the body what it needs, and let the rest be simple.',
    source: 'After Musonius Rufus, Lecture 18A',
  },
  {
    text: 'Nature asks for little; keep the body ready for its work.',
    source: 'After Seneca, Letter 16',
  },
];

/** The same line stays in place through a day, then turns over tomorrow. */
export function hydrosLineFor(date: Date = new Date(), lines: readonly HydrosLine[] = hydrosLines): HydrosLine {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return lines[(hash >>> 0) % lines.length];
}
