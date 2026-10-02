import { describe, expect, it } from 'vitest';
import { composeThinkThrough } from '../../core/practices/thinkThrough';
import { practices } from '../../core/practices/practices';

describe('think it through', () => {
  it('keeps only the person’s answers, under the questions they answered', () => {
    expect(composeThinkThrough({ happened: 'Email from my manager', otherwise: '  It may be a routine check  ', thought: ' ' })).toBe(
      'What happened?\nEmail from my manager\n\nWhat else could be true?\nIt may be a routine check',
    );
    expect(composeThinkThrough({})).toBe('');
  });

  it('offers grounding first among the practices', () => {
    expect(practices[0].id).toBe('ground');
  });
});
