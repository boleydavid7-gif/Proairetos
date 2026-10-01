const forbiddenPatternWords = [
  'overdue',
  'failed',
  'stalled',
  'avoiding',
];

export function containsJudgmentLanguage(text: string): boolean {
  const value = text.toLowerCase();
  return forbiddenPatternWords.some((word) => value.includes(word));
}
