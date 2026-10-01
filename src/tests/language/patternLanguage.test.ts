import { containsJudgmentLanguage, findJudgmentLanguage, forbiddenPatternWords } from '../../core/rules/languageRules';
import { orientationPrompt } from '../../core/compass/orientation';

const sources = import.meta.glob<string>(
  ['../../**/*.{ts,tsx}', '!../../tests/**', '!../../core/rules/languageRules.ts'],
  { query: '?raw', import: 'default', eager: true },
);

describe('pattern language boundaries', () => {
  it('defines prohibited judgment language', () => {
    expect(forbiddenPatternWords).toEqual(
      expect.arrayContaining(['overdue', 'failed', 'stalled', 'lazy', 'avoiding', 'behind', 'should']),
    );
  });

  it('matches whole words regardless of case', () => {
    expect(containsJudgmentLanguage('This item is Overdue')).toBe(true);
    expect(containsJudgmentLanguage('What should you adjust?')).toBe(true);
    expect(containsJudgmentLanguage('Rescheduled 3 times')).toBe(false);
    expect(containsJudgmentLanguage('Shoulder stretch')).toBe(false);
  });

  it('keeps system prompts free of judgment language', () => {
    expect(containsJudgmentLanguage(orientationPrompt)).toBe(false);
  });

  it('keeps every source file free of judgment language', () => {
    const files = Object.entries(sources);
    const offenders = files
      .map(([file, text]) => ({ file, words: findJudgmentLanguage(text) }))
      .filter((entry) => entry.words.length > 0);

    expect(files.length).toBeGreaterThan(10);
    expect(offenders).toEqual([]);
  });
});
