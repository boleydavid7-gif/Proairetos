/**
 * Words the system never uses when describing a person's life back to them.
 */
export const forbiddenPatternWords: readonly string[] = [
  'overdue',
  'failed',
  'stalled',
  'lazy',
  'avoiding',
  'behind',
];

export function containsJudgmentLanguage(text: string): boolean {
  const value = text.toLowerCase();
  return forbiddenPatternWords.some((word) => value.includes(word));
}
