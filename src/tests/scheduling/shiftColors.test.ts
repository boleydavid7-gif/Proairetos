import { describe, expect, it } from 'vitest';
import { occurrencesStartingOn } from '../../core/scheduling/patterns';
import type { SchedulePattern } from '../../core/scheduling/types';
import { colorShift } from '../../features/schedule/PatternEditor';

const rotation: SchedulePattern = {
  id: 'p',
  userId: 'u',
  name: 'Work',
  kind: 'COMMITTED',
  layout: 'CYCLE',
  anchorDate: '2026-09-29',
  color: 'slate',
  segments: [
    { days: 2, blocks: [{ start: '06:30', end: '14:30', label: 'Days' }] },
    { days: 1, blocks: [] },
    { days: 2, blocks: [{ start: '22:30', end: '06:30', label: 'Nights' }] },
    { days: 1, blocks: [] },
    { days: 1, blocks: [{ start: '22:30', end: '06:30', label: 'nights ' }] },
  ],
  createdAt: '',
  updatedAt: '',
};

describe('shift colours', () => {
  it('gives every shift with the same name the colour, and leaves the others', () => {
    const segments = colorShift(rotation.segments, 2, 'violet');
    expect(segments.map((s) => s.blocks[0]?.color)).toEqual([undefined, undefined, 'violet', undefined, 'violet']);
    expect(colorShift(segments, 4, undefined).map((s) => s.blocks[0]?.color)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('carries a shift colour onto its occurrences', () => {
    const pattern = { ...rotation, segments: colorShift(rotation.segments, 0, 'amber') };
    expect(occurrencesStartingOn(pattern, '2026-09-29')[0].color).toBe('amber');
    expect(occurrencesStartingOn(pattern, '2026-10-02')[0].color).toBeUndefined();
  });
});
