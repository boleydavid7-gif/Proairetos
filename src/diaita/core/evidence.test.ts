import { describe, expect, it } from 'vitest';
import { experimentFacts, sideBySide, suggestionFor, type SleepExperiment } from './evidence';

const nights = [
  { date: '2026-10-01', bed: '22:30', up: '06:30' },
  { date: '2026-10-02', bed: '23:00', up: '07:00' },
  { date: '2026-10-03', bed: '00:30', up: '07:30' },
  { date: '2026-10-04', bed: '22:45', up: '06:45' },
];

describe('Diaita evidence', () => {
  it('keeps a side-by-side comparison as recorded groups', () => {
    expect(sideBySide(nights, ['2026-10-01', '2026-10-03'], 'After a run')).toEqual([
      { label: 'After a run', nights: 2, averageMinutes: 450 },
      { label: 'Other recorded nights', nights: 2, averageMinutes: 480 },
    ]);
  });

  it('offers the regularity suggestion only when the log shows it', () => {
    expect(suggestionFor(nights, 7.5, '2026-10-04')?.id).toBe('regularity');
    expect(suggestionFor([{ date: '2026-10-01', bed: '22:30', up: '06:30' }], 7.5, '2026-10-04')).toBeUndefined();
  });

  it('places the two-week facts beside the previous two weeks', () => {
    const experiment: SleepExperiment = { kind: 'wake-time', startedOn: '2026-10-03', endsOn: '2026-10-16' };
    expect(experimentFacts(nights, experiment, '2026-10-16')).toEqual({
      current: { nights: 2, averageMinutes: 450 },
      before: { nights: 2, averageMinutes: 480 },
      complete: true,
    });
  });
});
