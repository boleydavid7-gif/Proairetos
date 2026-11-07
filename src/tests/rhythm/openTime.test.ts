import { describe, expect, it } from 'vitest';
import { itemSpan, openStretches } from '../../core/rhythm/openTime';
import { atTime } from '../../core/scheduling/dates';

const at = (time: string, date = '2026-10-02') => atTime(date, time);
const quiet = { on: true, start: '22:00', end: '07:00', duringProtected: true };
const day = { start: at('04:00'), end: at('04:00', '2026-10-03') };
const times = (spans: { start: Date; end: Date }[]) =>
  spans.map((s) => `${s.start.toTimeString().slice(0, 5)}-${s.end.toTimeString().slice(0, 5)}`);

describe('open time', () => {
  it('leaves what commitments, set times, and quiet hours do not take', () => {
    const busy = [{ start: at('09:00'), end: at('17:00') }, itemSpan(at('18:00').toISOString())];
    expect(times(openStretches(day, at('07:52'), busy, quiet))).toEqual(['08:00-09:00', '17:00-18:00', '18:30-22:00']);
  });

  it('skips short gaps and overlapping blocks, and shows nothing once the day is spent', () => {
    const busy = [{ start: at('08:00'), end: at('12:00') }, { start: at('11:00'), end: at('12:10') }, { start: at('12:30'), end: at('22:00') }];
    expect(times(openStretches(day, at('07:00'), busy, quiet))).toEqual(['07:00-08:00']);
    expect(openStretches(day, at('23:00'), [], quiet)).toEqual([]);
  });

  it('with quiet hours off, runs to the end of the day', () => {
    expect(times(openStretches(day, at('21:00'), [], { ...quiet, on: false }))).toEqual(['21:00-04:00']);
  });
});
