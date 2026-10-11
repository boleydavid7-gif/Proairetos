import { describe, expect, it } from 'vitest';
import { atTime } from '../../core/scheduling/dates';
import { facts, latestLines, series, valueText, type Reading } from './readings';

const at = (date: string, time = '08:00') => atTime(date, time).toISOString();
const bp = (date: string, value: number, value2: number): Reading => ({ id: date + value, kind: 'blood-pressure', value, value2, unit: 'mmHg', at: at(date) });

describe('readings', () => {
  it('writes values as they were taken', () => {
    expect(valueText(bp('2026-10-01', 122, 78))).toBe('122/78 mmHg');
    expect(valueText({ value: 5.62, unit: 'mmol/L' })).toBe('5.6 mmol/L');
  });

  it('groups by what was measured, newest first, other readings by their own name', () => {
    const list: Reading[] = [bp('2026-10-01', 120, 80), bp('2026-10-05', 118, 76), { id: 'p', kind: 'other', label: 'Peak flow', value: 450, unit: 'L/min', at: at('2026-10-03') }];
    const groups = series(list);
    expect(groups.map((group) => group.name)).toEqual(['Blood pressure', 'Peak flow']);
    expect(groups[0].latest.value).toBe(118);
  });

  it('gives plain facts for the last 30 days only, with two or more readings', () => {
    const list = [bp('2026-08-01', 150, 95), bp('2026-10-01', 120, 80), bp('2026-10-05', 130, 84)];
    expect(facts(list, '2026-10-10')).toEqual({ count: 2, lowest: '120/80 mmHg', highest: '130/84 mmHg', average: '125/82 mmHg' });
    expect(facts([bp('2026-10-01', 120, 80)], '2026-10-10')).toBeUndefined();
  });

  it('lists the latest of each for the shared list', () => {
    expect(latestLines([bp('2026-10-05', 118, 76)])[0]).toMatch(/^Blood pressure: 118\/76 mmHg/);
  });
});
