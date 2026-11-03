import { defaultShoe, shoeMileage, shoeProgress, shoeRunEntries, type Shoe } from '../../askesis/core/shoes';
import type { LogEntry } from '../../askesis/core/log';

const shoe: Shoe = {
  id: 'shoe-1',
  name: 'Daily trainers',
  startedOn: '2026-10-01',
  startingMeters: 50000,
  targetMeters: 800000,
  isDefault: true,
};

const run = (id: string, meters: number, extra: Partial<LogEntry> = {}): LogEntry => ({
  id,
  date: '2026-10-01',
  activity: 'run',
  meters,
  shoeId: shoe.id,
  createdAt: '2026-10-01T12:00:00.000Z',
  ...extra,
});

describe('Askesis shoe mileage', () => {
  it('adds starting mileage to only the runs assigned to this pair', () => {
    const entries = [
      run('run-1', 5000),
      run('run-2', 7000),
      run('walk-1', 3000, { activity: 'walk' }),
      run('other-shoe', 9000, { shoeId: 'shoe-2' }),
    ];
    expect(shoeRunEntries(shoe, entries).map((entry) => entry.id)).toEqual(['run-1', 'run-2']);
    expect(shoeMileage(shoe, entries)).toBe(62000);
  });

  it('reports progress only when the runner set a reminder and caps it at 100%', () => {
    expect(shoeProgress(shoe, [run('run-1', 350000)])).toBe(0.5);
    expect(shoeProgress(shoe, [run('run-1', 900000)])).toBe(1);
    expect(shoeProgress({ ...shoe, targetMeters: undefined }, [])).toBeUndefined();
  });

  it('chooses only an active shoe as the default', () => {
    expect(defaultShoe([shoe])?.id).toBe('shoe-1');
    expect(defaultShoe([{ ...shoe, retiredOn: '2026-11-01' }])).toBeUndefined();
  });
});
