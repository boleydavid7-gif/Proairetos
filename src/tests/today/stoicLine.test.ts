import { describe, expect, it } from 'vitest';
import { addDays } from '../../core/scheduling/dates';
import { stoicLineFor, stoicLines } from '../../core/stoic/dailyLine';

describe('daily Stoic line', () => {
  it('stays the same through a day', () => {
    expect(stoicLineFor('2026-10-01')).toBe(stoicLineFor('2026-10-01'));
  });

  it('varies across days', () => {
    const month = Array.from({ length: 30 }, (_, i) => stoicLineFor(addDays('2026-10-01', i)));
    expect(new Set(month).size).toBeGreaterThan(10);
  });

  it('only returns lines from the list', () => {
    for (let i = 0; i < 100; i++) expect(stoicLines).toContain(stoicLineFor(addDays('2026-01-01', i)));
  });
});
