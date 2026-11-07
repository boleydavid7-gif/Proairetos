import { describe, expect, it } from 'vitest';
import { mainSleeps, defaultRhythm } from './rhythm';

const clock = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

// Run in any time zone; where the clocks change on these nights, the wake time still follows the wall clock.
describe('an ordinary night across a clock change', () => {
  for (const [from, until] of [['2026-10-24', '2026-11-04'], ['2026-03-07', '2026-04-01']]) {
    it(`keeps bedtime plus the hours by the clock (${from})`, () => {
      const sleeps = mainSleeps(from, until, [], { ...defaultRhythm, bedtime: '21:30', sleepHours: 7.5 });
      expect(sleeps.length).toBeGreaterThan(5);
      for (const sleep of sleeps) {
        expect(clock(sleep.start)).toBe('21:30');
        expect(clock(sleep.end)).toBe('05:00');
      }
    });
  }
});
