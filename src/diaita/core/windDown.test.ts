import { describe, expect, it } from 'vitest';
import { CANT_SLEEP_STEPS, SHUFFLE_WORDS, shuffleWord } from './cantSleep';
import { defaultWindDown, windDownAt, windDownBounds, windDownMinutes, windDownPiece } from './windDown';

describe('wind-down pieces', () => {
  it('keeps the starting routine between ten and twenty minutes', () => {
    expect(windDownMinutes(defaultWindDown)).toBe(11);
    expect(windDownBounds(defaultWindDown)).toEqual([
      { id: 'breathing', start: 0, end: 180 },
      { id: 'body-scan', start: 180, end: 480 },
      { id: 'park-tomorrow', start: 480, end: 660 },
    ]);
  });

  it('finds the current piece and keeps a source on every piece', () => {
    expect(windDownAt(200, defaultWindDown)).toEqual({ id: 'body-scan', left: 280, index: 1 });
    expect(defaultWindDown.every((id) => windDownPiece(id).source.length > 0)).toBe(true);
  });

  it('ends after the last piece', () => {
    expect(windDownAt(660, defaultWindDown)).toBeUndefined();
  });
});

describe('the middle of the night', () => {
  it('puts stimulus control before the cognitive shuffle', () => {
    expect(CANT_SLEEP_STEPS.map((step) => step.id)).toEqual(['get-up', 'shuffle']);
    expect(CANT_SLEEP_STEPS.every((step) => step.source.length > 0)).toBe(true);
  });

  it('cycles through ordinary words without a clock', () => {
    expect(shuffleWord(0)).toBe(SHUFFLE_WORDS[0]);
    expect(shuffleWord(SHUFFLE_WORDS.length)).toBe(SHUFFLE_WORDS[0]);
  });
});
