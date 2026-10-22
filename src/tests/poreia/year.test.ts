import { describe, expect, it } from 'vitest';
import { countriesBeen, placesBeen, poreiaYear } from '../../poreia/core/year';
import type { Trip } from '../../poreia/core/model';

const trip = (id: string, start: string, end: string, place: Trip['place'], stops?: Trip['stops']): Trip => ({ id, name: place?.name ?? id, place, stops, start, end, travelers: 1, stage: 'booked', createdAt: '', updatedAt: '' });
const lisbon = { name: 'Lisbon', countryCode: 'PT', lat: 38.7, lon: -9.1 };
const porto = { name: 'Porto', countryCode: 'PT', lat: 41.1, lon: -8.6 };
const rome = { name: 'Rome', countryCode: 'IT', lat: 41.9, lon: 12.5 };
const list = [
  trip('a', '2026-03-01', '2026-03-06', lisbon),
  trip('b', '2026-06-10', '2026-06-20', lisbon, [{ id: 's1', place: lisbon, start: '2026-06-10', end: '2026-06-14' }, { id: 's2', place: porto, start: '2026-06-14', end: '2026-06-20' }]),
  trip('c', '2025-09-01', '2025-09-04', rome),
  trip('d', '2026-12-01', '2026-12-05', rome),
];

describe('where you have been', () => {
  it('lists each place once, newest first, with its trips, and the countries', () => {
    const places = placesBeen(list, '2026-10-22');
    expect(places.map((each) => [each.place.name, each.trips])).toEqual([['Porto', 1], ['Lisbon', 2], ['Rome', 1]]);
    expect(countriesBeen(list, '2026-10-22', 'en').map((each) => [each.name, each.places])).toEqual([['Italy', 1], ['Portugal', 2]]);
  });

  it('says the year in facts, leaving out trips still to come', () => {
    const year = poreiaYear(list, [{ tripId: 'a', kind: 'flight' }, { tripId: 'd', kind: 'flight' }], [{ id: 'o', title: 'x', start: '2026-03-02', end: '2026-03-06', status: 'approved', hours: 32, createdAt: '', updatedAt: '' }], 2026, '2026-10-22');
    expect(year.facts).toEqual([
      { label: 'Trips', value: '2' },
      { label: 'Nights away', value: '15' },
      { label: 'Places', value: '2' },
      { label: 'Countries', value: '1' },
      { label: 'Flights', value: '1' },
      { label: 'Time off taken', value: '32 h' },
    ]);
    expect(year.lists[0].lines).toHaveLength(2);
  });
});
