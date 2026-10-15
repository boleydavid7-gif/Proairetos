import { describe, expect, it } from 'vitest';
import { fromAppsRows } from '../../app/family/fromApps';
import { dayText } from '../../phyton/core/plants';
import type { Dose, Medicine } from '../../therapeia/core/medicines';

const medicine = { id: 'm1', name: 'Sertraline', dose: '50 mg' } as Medicine;
const dose = (hour: number, slot: string): Dose => ({ medicine, slot, date: '2026-10-12', index: 0, at: new Date(2026, 9, 12, hour), label: '' });

describe('From your apps', () => {
  it('puts every app’s rows in one list: doses by time, then chores, plants, upkeep and training', () => {
    const rows = fromAppsRows({
      today: '2026-10-12',
      dayText,
      clock: (at) => `${at.getHours()}:00`,
      doses: [dose(20, '2026-10-12#1'), dose(8, '2026-10-12#0')],
      chores: [{ chore: { id: 'c1', name: 'Take out the trash', who: 'Sam' } as never, day: '2026-10-12' }],
      plants: [{ plant: { id: 'p1', name: 'Fern' } as never, day: '2026-10-09' }],
      upkeep: [{ upkeep: { id: 'u1', name: 'Air filter' } as never, due: { date: '2026-10-12' }, thing: 'Furnace' }],
      training: { name: 'Session A', minutes: 40 },
    });
    expect(rows.map((row) => row.title)).toEqual(['Sertraline', 'Sertraline', 'Take out the trash', 'Fern', 'Air filter', 'Session A']);
    expect(rows[0].detail).toBe('8:00 · 50 mg · Therapeia');
    expect(rows[2].detail).toBe('Sam · Ergon');
    expect(rows[3]).toMatchObject({ done: 'Watered', href: '/phyton/?open=plant%3Ap1' });
    expect(rows[3].detail).toMatch(/^Check the soil · Since \S+ · Phyton$/);
    expect(rows[4].detail).toBe('Furnace · Ktema');
    expect(rows[5].mark).toBeUndefined();
  });

  it('is empty when nothing came around', () => {
    expect(fromAppsRows({ today: '2026-10-12', dayText, clock: () => '' })).toEqual([]);
  });
});
