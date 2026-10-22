import { describe, expect, it } from 'vitest';
import { crowds, timesThatFit, type Session } from '../../core/training/clash';
import { fitDays, fitWeek } from '../../core/training/fitWeek';
import { atTime } from '../../core/scheduling/dates';

const quiet = { on: true, start: '22:00', end: '07:00', duringProtected: true };
const day = '2026-10-29';
const at = (time: string) => atTime(day, time);
const now = new Date(2026, 9, 29, 8, 0);
const run: Session = { app: 'askesis', id: 'r1', title: 'Easy run', date: day, minutes: 40, at: at('18:00') };

describe('a new thing on a training day', () => {
  it('crowds a session it overlaps, with a little room either side', () => {
    expect(crowds(run, { start: at('17:30'), end: at('18:15') }, [], quiet, now)).toBe(true);
    expect(crowds(run, { start: at('18:50'), end: at('20:00') }, [], quiet, now)).toBe(true);
    expect(crowds(run, { start: at('19:00'), end: at('20:00') }, [], quiet, now)).toBe(false);
  });

  it('crowds a session with no time only when it leaves no room in the day', () => {
    const untimed = { ...run, at: undefined };
    const work = [{ start: at('07:00'), end: at('19:30') }];
    expect(crowds(untimed, { start: at('19:45'), end: at('20:30') }, work, quiet, now)).toBe(true);
    expect(crowds(untimed, { start: at('12:00'), end: at('13:00') }, [], quiet, now)).toBe(false);
  });

  it('offers times that hold the whole session clear of everything, nearest first', () => {
    const busy = [{ start: at('07:00'), end: at('15:00') }, { start: at('17:30'), end: at('19:00') }];
    const times = timesThatFit(run, busy, quiet, now, run.at);
    expect(times.length).toBeGreaterThan(0);
    for (const start of times) {
      const end = new Date(start.getTime() + run.minutes * 60_000);
      for (const span of busy) expect(start < new Date(span.end.getTime() + 15 * 60_000) && end > new Date(span.start.getTime() - 15 * 60_000)).toBe(false);
      expect(end <= at('21:00')).toBe(true);
    }
    expect(times[0].getTime()).toBe(at('19:15').getTime());
  });

  it('places a session kept off its day elsewhere in the week', () => {
    const days = fitDays('2026-10-26', new Set(), new Set());
    const fit = fitWeek({ days, from: '2026-10-26', runs: [{ id: 'r1', run: 'easy', prefer: day, avoid: [day] }], lifts: [], fixed: [], workDays: 'free' });
    expect(fit.runs.r1).toBeDefined();
    expect(fit.runs.r1).not.toBe(day);
  });
});

describe('training and sleep', () => {
  it('keeps the hour before bed, the wind-down and sleep clear, and naps only when chosen', async () => {
    const { sleepTaken } = await import('../../core/training/clash');
    const plan = [
      { kind: 'wind-down', start: at('21:30'), end: at('22:30') },
      { kind: 'sleep', start: at('22:30'), end: atTime('2026-10-30', '06:30') },
      { kind: 'nap', start: at('13:00'), end: at('14:30') },
    ];
    expect(sleepTaken(plan, false)).toEqual([
      { start: at('21:30'), end: at('22:30') },
      { start: at('21:30'), end: atTime('2026-10-30', '06:30') },
    ]);
    expect(sleepTaken(plan, true)).toHaveLength(3);
  });

  it('never offers a time ending within an hour of bed', async () => {
    const { sleepTaken } = await import('../../core/training/clash');
    const late = { ...run, at: at('19:30') };
    const sleep = sleepTaken([{ kind: 'sleep', start: at('21:00'), end: atTime('2026-10-30', '05:00') }], false);
    const times = timesThatFit(late, [{ start: at('06:00'), end: at('18:30') }, ...sleep], quiet, now, late.at);
    for (const start of times) expect(start.getTime() + late.minutes * 60_000 <= at('20:00').getTime()).toBe(true);
  });

  it('without a sleep plan, keeps the hour before quiet hours', async () => {
    const { beforeQuiet } = await import('../../core/training/clash');
    expect(beforeQuiet(day, quiet)).toContainEqual({ start: at('21:00'), end: at('22:00') });
  });
});
