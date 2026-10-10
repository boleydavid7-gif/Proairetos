import { localDate } from './bills';

export type FinanceLine = { text: string; source: string };

const lines: readonly FinanceLine[] = [
  {
    text: 'It is not the man who has too little, but the man who craves more, that is poor.',
    source: 'Seneca, Letters 2',
  },
  {
    text: 'If you live according to nature, you will never be poor; if according to opinion, you will never be rich.',
    source: 'Seneca, Letters 16',
  },
  {
    text: 'Wealth consists not in having great possessions, but in having few wants.',
    source: 'Epictetus, attributed',
  },
];

/** One finance line for a local day, steady until the day changes. */
export function financeLineFor(date = localDate()): FinanceLine {
  let hash = 2166136261;
  for (const character of date) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return lines[(hash >>> 0) % lines.length];
}
