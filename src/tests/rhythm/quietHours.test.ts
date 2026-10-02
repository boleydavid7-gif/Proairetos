import { describe, expect, it } from 'vitest';
import { defaultQuietHours, deliverAt } from '../../core/rhythm/quietHours';
import { atTime } from '../../core/scheduling/dates';
import type { ScheduleOccurrence } from '../../core/scheduling/types';

const at = (date: string, time: string) => atTime(date, time);
const quiet = defaultQuietHours;

describe('quiet hours', () => {
  it('leaves daytime reminders alone', () => {
    expect(deliverAt(at('2026-10-02', '14:00'), quiet, [])).toEqual(at('2026-10-02', '14:00'));
  });

  it('holds overnight reminders until the quiet ends, on either side of midnight', () => {
    expect(deliverAt(at('2026-10-02', '23:30'), quiet, [])).toEqual(at('2026-10-03', '07:00'));
    expect(deliverAt(at('2026-10-03', '05:00'), quiet, [])).toEqual(at('2026-10-03', '07:00'));
  });

  it('holds reminders during protected time, then through quiet hours that follow', () => {
    const sleep: ScheduleOccurrence = {
      patternId: 'p', patternName: 'Sleep after nights', kind: 'PROTECTED', date: '2026-10-03',
      start: at('2026-10-03', '08:00'), end: at('2026-10-03', '15:00'), changed: false,
    };
    expect(deliverAt(at('2026-10-03', '09:00'), quiet, [sleep])).toEqual(at('2026-10-03', '15:00'));
    const late = { ...sleep, start: at('2026-10-03', '20:00'), end: at('2026-10-03', '23:00') };
    expect(deliverAt(at('2026-10-03', '21:00'), quiet, [late])).toEqual(at('2026-10-04', '07:00'));
  });

  it('does nothing when turned off', () => {
    expect(deliverAt(at('2026-10-02', '23:30'), { ...quiet, on: false, duringProtected: false }, [])).toEqual(at('2026-10-02', '23:30'));
  });
});
