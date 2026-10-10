import { stoicLineFor, type StoicLine } from '../../core/stoic/dailyLine';

/** Short Stoic passages and close paraphrases for Hydros' daily home line. */
export const hydrosQuotes: readonly StoicLine[] = [
  { text: 'The body is the instrument of the mind; keep it in working order.', source: 'After Musonius Rufus, Lecture 6' },
  { text: 'Drink simply; the body asks for what sustains it, not for excess.', source: 'After Musonius Rufus, Lecture 18A' },
  { text: 'Moderation is enough for a sound body and a steady mind.', source: 'After Musonius Rufus, Lecture 18B' },
  { text: 'Nature asks for little; give the body what it needs, and leave the rest.', source: 'After Seneca, Letter 16' },
  { text: 'Care for the body so it may remain obedient to the mind.', source: 'After Seneca, Letters 8' },
];

/** Keeps one line through a local day and changes it on the next. */
export function hydrosQuoteFor(date: string): StoicLine {
  return stoicLineFor(date, hydrosQuotes);
}
