import { stoicLineFor, type StoicLine } from '../../core/stoic/dailyLine';

/** Short lines on the body and enough, from the Stoics and Epicurus, each with its source. */
export const hydrosQuotes: readonly StoicLine[] = [
  { text: 'Indulge the body only so far as is needful for good health.', source: 'Seneca, Letters 8' },
  { text: 'Natural desires are limited.', source: 'Seneca, Letters 16' },
  { text: 'The wealth required by nature is limited and is easy to procure.', source: 'Epicurus, Principal Doctrines 15' },
  { text: 'Plain fare gives as much pleasure as a costly diet, once the pain of want is removed.', source: 'Epicurus, Letter to Menoeceus' },
]

/** Keeps one line through a local day and changes it on the next. */
export function hydrosQuoteFor(date: string): StoicLine {
  return stoicLineFor(date, hydrosQuotes);
}
