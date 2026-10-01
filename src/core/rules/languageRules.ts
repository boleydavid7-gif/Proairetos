/**
 * Words the system never uses when describing a person's life back to them.
 * "should" is included because the app never tells anyone what to do.
 */
export const forbiddenPatternWords: readonly string[] = [
  'overdue',
  'failed',
  'stalled',
  'lazy',
  'avoiding',
  'behind',
  'should',
];

const judgmentPattern = new RegExp(`\\b(${forbiddenPatternWords.join('|')})\\b`, 'i');

export function containsJudgmentLanguage(text: string): boolean {
  return judgmentPattern.test(text);
}

export function findJudgmentLanguage(text: string): string[] {
  const global = new RegExp(judgmentPattern.source, 'gi');
  return [...text.matchAll(global)].map((match) => match[0].toLowerCase());
}
