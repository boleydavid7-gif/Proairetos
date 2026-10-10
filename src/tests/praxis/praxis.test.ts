import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { addDaysKey, formatMinutes, minutesByBlock, minutesByDay, unusedStarters, weekOf } from '../../praxis/data';
import type { ItemEvent } from '../../core/item-events/types';
import { personalDate } from '../../core/rhythm/personalDay';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { findJudgmentLanguage } from '../../core/rules/languageRules';

const focus = (id: string, itemId: string, at: Date, minutes: number): ItemEvent => ({ id, itemId, kind: 'FOCUSED', timestamp: at.toISOString(), metadata: { minutes, app: 'praxis' } });

describe('Praxis time, as recorded', () => {
  it('has one week, Monday to Sunday', () => {
    expect(weekOf('2026-10-10')).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
    expect(addDaysKey('2026-10-31', 3)).toBe('2026-11-03');
  });

  it('adds minutes by day and by block, leaving other focus out', () => {
    const events = [
      focus('a', 'x', new Date(2026, 9, 6, 9), 25),
      focus('b', 'y', new Date(2026, 9, 6, 15), 50),
      focus('c', 'x', new Date(2026, 9, 8, 9), 10),
      { ...focus('d', 'z', new Date(2026, 9, 8, 9), 30), metadata: { minutes: 30 } },
    ];
    expect(minutesByDay(events, weekOf('2026-10-10'))).toEqual([0, 75, 0, 10, 0, 0, 0]);
    expect(minutesByBlock(events, weekOf('2026-10-10'))).toEqual([{ itemId: 'y', minutes: 50 }, { itemId: 'x', minutes: 35 }]);
  });

  it('keeps study on a night shift with the day it began', () => {
    const night: ScheduleOccurrence = { patternId: 'p', patternName: 'Work', kind: 'COMMITTED', date: '2026-10-06', start: new Date(2026, 9, 6, 19), end: new Date(2026, 9, 7, 7), changed: false };
    const dayAt = (when: Date) => personalDate(when, [night], { startHour: 0, followShifts: true });
    expect(minutesByDay([focus('a', 'x', new Date(2026, 9, 7, 3), 25)], weekOf('2026-10-10'), dayAt)).toEqual([0, 25, 0, 0, 0, 0, 0]);
  });

  it('writes time plainly', () => {
    expect([formatMinutes(25), formatMinutes(60), formatMinutes(95)]).toEqual(['25 min', '1 h', '1 h 35 min']);
  });

  it('finds the starter blocks an earlier version made, only if never used', () => {
    const items = [
      { id: '1', title: 'Deep Work', status: 'OPEN', app: 'praxis' },
      { id: '2', title: 'Read and take notes', status: 'OPEN', app: 'praxis' },
      { id: '3', title: 'Deep Work', status: 'OPEN' },
      { id: '4', title: 'Spanish', status: 'OPEN', app: 'praxis' },
    ];
    expect(unusedStarters(items, [focus('a', '2', new Date(), 25)]).map((item) => item.id)).toEqual(['1']);
  });

  it('shows no scores on its screens', () => {
    const source = readFileSync('src/praxis/PraxisApp.tsx', 'utf8') + readFileSync('src/praxis/views.tsx', 'utf8');
    expect(source).not.toMatch(/completion|Sessions completed|averageCompletion/);
    expect(findJudgmentLanguage(source)).toEqual([]);
  });
});
