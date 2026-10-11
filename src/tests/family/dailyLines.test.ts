import { describe, expect, it } from 'vitest';
import { LINES, lineOf } from '../../app/family/dailyLines';
import { addDays } from '../../core/scheduling/dates';

describe('daily lines', () => {
  it('gives every app Stoic and Buddhist lines, each with where it is from', () => {
    for (const lists of Object.values(LINES)) {
      expect(lists.stoic.length).toBeGreaterThanOrEqual(3);
      expect(lists.buddhist.length).toBeGreaterThanOrEqual(3);
      for (const line of [...lists.stoic, ...lists.buddhist]) expect(line.by.length).toBeGreaterThan(3);
    }
  });

  it('keeps one line all day and takes the traditions in turn', () => {
    const stoic = new Set(LINES.dynamis.stoic.map((line) => line.text));
    const days = Array.from({ length: 6 }, (_, index) => lineOf('dynamis', addDays('2026-10-01', index)));
    expect(days.map((line) => stoic.has(line.text))).toEqual([true, false, true, false, true, false].map((first) => (stoic.has(days[0].text) ? first : !first)));
    expect(lineOf('dynamis', '2026-10-01')).toEqual(days[0]);
  });
});
