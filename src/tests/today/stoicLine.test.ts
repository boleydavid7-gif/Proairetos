import { describe, expect, it } from 'vitest';
import { addDays } from '../../core/scheduling/dates';
import { dailyLineFor, dailyLines, stoicLineFor, stoicLines } from '../../core/stoic/dailyLine';

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

describe('ways to try the daily line', () => {
  it('pairs every line with one way to try it', async () => {
    const { stoicLines } = await import('../../core/stoic/dailyLine');
    for (let i = 0; i < 400; i++) {
      const line = stoicLineFor(addDays('2026-01-01', i));
      expect(line.tryIt, line.text).toBeTruthy();
    }
    expect(stoicLines.length).toBeGreaterThan(10);
  });
});

describe('Today’s wider daily line', () => {
  it('rotates through Stoic, Buddhist, and mindfulness lines', () => {
    expect(dailyLines.length).toBeGreaterThan(stoicLines.length);
    const month = Array.from({ length: 90 }, (_, i) => dailyLineFor(addDays('2026-01-01', i)));
    expect(month.some((line) => line.source?.includes('Dhammapada'))).toBe(true);
    expect(month.some((line) => line.source?.includes('Thich Nhat Hanh') || line.source?.includes('Kabat-Zinn'))).toBe(true);
  });
});
