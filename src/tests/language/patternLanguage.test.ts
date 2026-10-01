const forbiddenPatternWords = [
  'overdue',
  'failed',
  'stalled',
  'lazy',
  'avoiding',
  'behind',
];

describe('pattern language boundaries', () => {
  it('defines prohibited judgment language', () => {
    expect(forbiddenPatternWords).toContain('overdue');
  });
});
