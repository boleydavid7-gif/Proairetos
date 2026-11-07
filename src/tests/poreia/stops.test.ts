import { describe, expect, it } from 'vitest';
import { placeLine, placesOf, stopNow, stopOn, withStops, type Trip } from '../../poreia/core/model';

const stamp = '2026-10-01T00:00:00.000Z';
const lisbon = { name: 'Lisbon' };
const porto = { name: 'Porto' };
const madrid = { name: 'Madrid' };
const base: Trip = { id: 't', name: 'Iberia', travelers: 2, stage: 'planning', createdAt: stamp, updatedAt: stamp };

describe('trips with several stops', () => {
  const trip = withStops(base, [
    { id: 'b', place: porto, start: '2026-11-13', end: '2026-11-16' },
    { id: 'a', place: lisbon, start: '2026-11-10', end: '2026-11-13' },
    { id: 'c', place: madrid, start: '2026-11-16', end: '2026-11-19' },
  ]);

  it('puts the stops in date order and takes the trip dates from them', () => {
    expect(trip.stops!.map((stop) => stop.place.name)).toEqual(['Lisbon', 'Porto', 'Madrid']);
    expect([trip.start, trip.end, trip.place?.name]).toEqual(['2026-11-10', '2026-11-19', 'Lisbon']);
  });

  it('knows where each day is, the day of moving on going to the new place', () => {
    expect(stopOn(trip, '2026-11-11')?.place.name).toBe('Lisbon');
    expect(stopOn(trip, '2026-11-13')?.place.name).toBe('Porto');
    expect(placeLine(trip, '2026-11-13')).toBe('Lisbon → Porto');
    expect(placeLine(trip, '2026-11-14')).toBe('Porto');
    expect(stopNow(trip, '2026-11-01')?.place.name).toBe('Lisbon');
    expect(stopNow(trip, '2026-11-17')?.place.name).toBe('Madrid');
  });

  it('keeps a one-place trip as it was', () => {
    const one = { ...base, place: lisbon, start: '2026-11-10', end: '2026-11-13' };
    expect(placesOf(one)).toEqual([{ id: 'main', place: lisbon, start: '2026-11-10', end: '2026-11-13' }]);
    expect(placeLine(one, '2026-11-11')).toBeUndefined();
    expect(withStops(one, [{ id: 'a', place: porto }]).stops).toBeUndefined();
  });
});
