import { bellFor, cuesFor } from '../../askesis/core/cues';
import { buildPath } from '../../askesis/core/plans';
import { flatten } from '../../askesis/core/workouts';

describe('session bells', () => {
  it('rings at every change and three times at the end, never at the start', () => {
    const steps = flatten(buildPath({ aim: { kind: 'time', minutes: 30 }, days: 3 }).weeks[0].workouts[0].parts);
    const cues = cuesFor(steps);
    expect(cues.length).toBe(steps.length);
    expect(cues[0].at).toBeGreaterThan(0);
    const total = steps.reduce((sum, step) => sum + step.minutes * 60, 0);
    expect(cues.at(-1)).toMatchObject({ at: total, bells: 3 });
    for (let i = 1; i < cues.length; i += 1) expect(cues[i].at).toBeGreaterThan(cues[i - 1].at);
  });

  it('sounds different for walking, running and faster running', () => {
    expect(bellFor('walk')).toEqual({ bells: 2, rate: 0.84 });
    expect(bellFor('easy')).toEqual({ bells: 1, rate: 1 });
    expect(bellFor('hard').rate).toBeGreaterThan(1);
  });
});

describe('lengths in words', () => {
  it('keeps half minutes', async () => {
    const { lengthLabel } = await import('../../askesis/core/workouts');
    expect(lengthLabel(2.5)).toBe('2½ min');
    expect(lengthLabel(7.5)).toBe('7½ min');
    expect(lengthLabel(3)).toBe('3 min');
    expect(lengthLabel(0.5)).toBe('30 s');
    expect(lengthLabel(12.4)).toBe('12 min');
  });
});
