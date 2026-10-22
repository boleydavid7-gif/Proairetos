import { describe, expect, it } from 'vitest';
import { fitDays, fitWeek, type FitInput } from '../../core/training/fitWeek';
import { addDays, daysBetween } from '../../core/scheduling/dates';

const monday = '2026-10-26';
const d = (n: number) => addDays(monday, n);
const apart = (a: string, b: string) => Math.abs(daysBetween(a, b));
const week = (work: number[] = [], nights: number[] = []) => fitDays(monday, new Set(work.map(d)), new Set(nights.map(d)));
const input = (patch: Partial<FitInput>): FitInput => ({ days: week(), from: monday, runs: [], lifts: [], fixed: [], workDays: 'free', ...patch });
const runs3 = [
  { id: 'r1', run: 'easy' as const },
  { id: 'r2', run: 'hard' as const },
  { id: 'r3', run: 'long' as const },
];
const lifts2 = [
  { id: 'l1', legs: true },
  { id: 'l2', legs: true },
];

describe('fitting a training week', () => {
  it('keeps work days free and runs and lifts apart', () => {
    const fit = fitWeek(input({ days: week([0, 1, 2]), runs: runs3, lifts: lifts2 }));
    const used = [...Object.values(fit.runs), ...Object.values(fit.lifts)];
    expect(used).toHaveLength(5);
    expect(used.some((date) => [d(0), d(1), d(2)].includes(date))).toBe(false);
    // Four days off for five sessions: one shared day, and only with the easy run.
    const shared = Object.values(fit.lifts).filter((date) => Object.values(fit.runs).includes(date));
    expect(shared).toEqual([fit.runs.r1]);
  });

  it('never puts leg strength the day before the long or hard run, nor two hard runs back to back', () => {
    const fit = fitWeek(input({ runs: runs3, lifts: lifts2 }));
    for (const lift of Object.values(fit.lifts)) {
      expect([fit.runs.r2, fit.runs.r3]).not.toContain(addDays(lift, 1));
      expect(Object.values(fit.runs)).not.toContain(lift);
    }
    expect(apart(fit.runs.r2, fit.runs.r3)).toBeGreaterThan(1);
    expect(apart(fit.lifts.l1, fit.lifts.l2)).toBeGreaterThan(1);
  });

  it('uses work days when the person lets it, and leaves sessions unplaced when kept free', () => {
    const busy = week([0, 1, 2, 3, 4, 5]);
    const free = fitWeek(input({ days: busy, runs: runs3, lifts: lifts2 }));
    expect(Object.keys(free.runs)).toEqual(['r3']);
    expect(Object.keys(free.lifts)).toEqual([]);
    const needed = fitWeek(input({ days: busy, runs: runs3, lifts: lifts2, workDays: 'needed' }));
    expect(Object.keys(needed.runs).length + Object.keys(needed.lifts).length).toBe(5);
    expect(needed.runs.r3).toBe(d(6));
  });

  it('keeps the long run off the morning after a night', () => {
    const fit = fitWeek(input({ days: week([], [5]), runs: [{ id: 'r3', run: 'long' }], lifts: [] }));
    expect(fit.runs.r3).not.toBe(d(5));
  });

  it('fits around sessions with a day already and only from today on', () => {
    const fit = fitWeek(input({ from: d(3), runs: [{ id: 'r3', run: 'long' }], lifts: [{ id: 'l1', legs: true }], fixed: [{ date: d(4), run: 'hard' }] }));
    expect(fit.runs.r3 >= d(3)).toBe(true);
    expect(fit.runs.r3).not.toBe(d(4));
    expect(fit.runs.r3).not.toBe(d(5));
    expect([d(4), d(6)]).not.toContain(fit.lifts.l1);
  });

  it('keeps chosen days when nothing is in the way', () => {
    const fit = fitWeek(input({ runs: [{ id: 'r1', run: 'easy', prefer: d(1) }, { id: 'r2', run: 'easy', prefer: d(3) }], lifts: [{ id: 'l1', legs: false, prefer: d(5) }] }));
    expect(fit).toEqual({ runs: { r1: d(1), r2: d(3) }, lifts: { l1: d(5) } });
  });
});
