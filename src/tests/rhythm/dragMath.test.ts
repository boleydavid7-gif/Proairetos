import { describe, expect, it } from 'vitest';
import { lengthMinutes, resizedEnd, shiftedStart, snapMinutes } from '../../core/rhythm/dragMath';

describe('dragging in the week', () => {
  it('snaps a pull to 15-minute steps', () => {
    expect(snapMinutes(44, 44)).toBe(60);
    expect(snapMinutes(10, 44)).toBe(15);
    expect(snapMinutes(4, 44)).toBe(0);
    expect(snapMinutes(-30, 44)).toBe(-45);
  });

  it('moves a start by minutes and onto another day, keeping the time of day', () => {
    const start = new Date(2026, 9, 9, 15, 0).toISOString();
    expect(new Date(shiftedStart(start, 30)).getHours()).toBe(15);
    expect(new Date(shiftedStart(start, 30)).getMinutes()).toBe(30);
    const onto = new Date(shiftedStart(start, 0, '2026-10-12'));
    expect([onto.getFullYear(), onto.getMonth(), onto.getDate(), onto.getHours()]).toEqual([2026, 9, 12, 15]);
  });

  it('resizes the end, never below one step, from a set end or the planned length', () => {
    const start = new Date(2026, 9, 9, 15, 0).toISOString();
    const end = new Date(2026, 9, 9, 16, 0).toISOString();
    expect(new Date(resizedEnd(start, end, undefined, 30)).getMinutes()).toBe(30);
    expect(new Date(resizedEnd(start, end, undefined, -600)).getTime() - new Date(start).getTime()).toBe(15 * 60_000);
    expect(lengthMinutes(start, undefined, 45)).toBe(45);
    expect(lengthMinutes(start, undefined, undefined)).toBe(30);
    expect(new Date(resizedEnd(start, undefined, 45, 15)).getTime() - new Date(start).getTime()).toBe(60 * 60_000);
  });
});
