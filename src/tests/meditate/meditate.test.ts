import { describe, expect, it } from 'vitest';
import { breathAt, breathPattern, breathPatterns, cycleSeconds, patternCounts } from '../../core/meditate/breathing';
import { cueAt, sessionCues, sessionLengths, sessions } from '../../core/meditate/sessions';
import { containsJudgmentLanguage } from '../../core/rules/languageRules';

describe('breathing', () => {
  const calm = breathPattern('calm');

  it('walks through the steps of a cycle and starts again', () => {
    expect(cycleSeconds(calm)).toBe(10);
    expect(breathAt(0, calm).step.kind).toBe('in');
    expect(breathAt(3.9, calm).step.kind).toBe('in');
    expect(breathAt(4, calm).step.kind).toBe('out');
    expect(breathAt(10.5, calm).step.kind).toBe('in');
    expect(breathAt(14, calm).stepStart).toBe(14);
  });

  it('opens the circle on the in-breath and closes it on the out-breath', () => {
    expect(breathAt(0, calm).size).toBe(0);
    expect(breathAt(2, calm).size).toBeCloseTo(0.5);
    expect(breathAt(4, calm).size).toBeCloseTo(1);
    expect(breathAt(9.99, calm).size).toBeCloseTo(0, 2);
    const box = breathPattern('box');
    expect(breathAt(6, box).size).toBe(1);
    expect(breathAt(14, box).size).toBe(0);
  });

  it('counts down whole seconds and never shows 0', () => {
    expect(breathAt(0, calm).count).toBe(4);
    expect(breathAt(0.5, calm).count).toBe(4);
    expect(breathAt(3.5, calm).count).toBe(1);
    expect(breathAt(4, calm).count).toBe(6);
  });

  it('describes each pattern in counts', () => {
    expect(patternCounts(breathPattern('four-seven-eight'))).toBe('4 in · 7 hold · 8 out');
    for (const pattern of breathPatterns) expect(cycleSeconds(pattern)).toBeGreaterThan(0);
  });
});

describe('sessions', () => {
  it('fits every cue inside the session, in order', () => {
    for (const script of sessions) {
      for (const minutes of sessionLengths) {
        const cues = sessionCues(script, minutes);
        expect(cues.length).toBeGreaterThanOrEqual(script.opening.length + script.closing.length);
        for (let index = 1; index < cues.length; index++) expect(cues[index].at).toBeGreaterThan(cues[index - 1].at);
        expect(cues[cues.length - 1].at).toBeLessThan(minutes * 60);
      }
    }
  });

  it('spreads more of the middle into a longer sit', () => {
    const guided = sessions[0];
    expect(sessionCues(guided, 30).length).toBeGreaterThan(sessionCues(guided, 5).length);
  });

  it('shows the latest cue that has begun', () => {
    const cues = [
      { at: 3, text: 'a' },
      { at: 20, text: 'b' },
    ];
    expect(cueAt(cues, 1)).toBeUndefined();
    expect(cueAt(cues, 10)?.text).toBe('a');
    expect(cueAt(cues, 25)?.text).toBe('b');
  });

  it('uses calm words', () => {
    for (const script of sessions)
      for (const text of [script.line, ...script.opening, ...script.middle, ...script.closing])
        expect(containsJudgmentLanguage(text)).toBe(false);
  });
});
