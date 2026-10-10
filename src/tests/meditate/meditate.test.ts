import { describe, expect, it } from 'vitest';
import { breathAt, breathPattern, breathPatterns, cycleSeconds, patternCounts } from '../../core/meditate/breathing';
import { freeGuidedMeditations } from '../../core/meditate/freeMeditations';
import { sessionLengths, sessions } from '../../core/meditate/sessions';
import { defaultSetup, isChanged, setupFor } from '../../core/meditate/setup';
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
  it('keeps the built-in sits quiet and distinct', () => {
    expect(sessions.map((script) => script.id)).toEqual(['mindfulness', 'sleep', 'focus', 'kindness']);
    for (const script of sessions) {
      expect(sessionLengths).toContain(script.minutes);
      expect(script.line.length).toBeGreaterThan(0);
    }
  });

  it('uses calm words', () => {
    for (const script of sessions) expect(containsJudgmentLanguage(script.line)).toBe(false);
  });

  it('offers public libraries for recorded guidance', () => {
    expect(freeGuidedMeditations.length).toBeGreaterThan(2);
    for (const meditation of freeGuidedMeditations) expect(meditation.url).toMatch(/^https:\/\//);
  });
});

describe('each kind of sit is the person own', () => {
  it('starts from its own defaults', () => {
    expect(defaultSetup('sleep')).toMatchObject({ bells: false, sounds: ['rain'], breathSounds: false });
    expect(defaultSetup('kindness').music).toBe('mozart');
    expect(defaultSetup('breathe')).toMatchObject({ counts: true, minutes: 3, pace: 'calm' });
  });

  it('keeps only what was changed, and knows when nothing was', () => {
    expect(setupFor('mindfulness', { minutes: 20 }).minutes).toBe(20);
    expect(setupFor('mindfulness', { minutes: 20 }).pace).toBe(defaultSetup('mindfulness').pace);
    expect(isChanged('mindfulness', undefined)).toBe(false);
    expect(isChanged('mindfulness', { minutes: defaultSetup('mindfulness').minutes })).toBe(false);
    expect(isChanged('mindfulness', { sounds: ['rain'] })).toBe(true);
  });
});
