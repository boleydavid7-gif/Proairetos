import { containsJudgmentLanguage, forbiddenPatternWords } from '../../core/rules/languageRules';
import { orientationPrompt } from '../../core/compass/orientation';

describe('pattern language boundaries', () => {
  it('defines prohibited judgment language', () => {
    expect(forbiddenPatternWords).toContain('overdue');
    expect(forbiddenPatternWords).toContain('behind');
  });

  it('detects judgment language regardless of case', () => {
    expect(containsJudgmentLanguage('This item is Overdue')).toBe(true);
    expect(containsJudgmentLanguage('Rescheduled 3 times')).toBe(false);
  });

  it('keeps system prompts free of judgment language', () => {
    expect(containsJudgmentLanguage(orientationPrompt)).toBe(false);
  });
});
