import { describe, expect, it } from 'vitest';
import { defaultDrinkProfiles, type Drink } from '../../hydros/core/drinks';
import { drinksCsv } from '../../hydros/core/export';

const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 5).toISOString();
const drink = (id: string, loggedAt: string, extra: Partial<Drink> = {}): Drink => ({ id, kind: 'water', amountOz: 16, loggedAt, createdAt: loggedAt, ...extra });

describe('drinksCsv', () => {
  it('lists every drink oldest first in local time and the chosen unit', () => {
    const csv = drinksCsv(
      [drink('b', at(15, 9), { kind: 'coffee', amountOz: 8, caffeineMg: 95 }), drink('a', at(14, 7), { label: 'Say "hi"' })],
      defaultDrinkProfiles(),
      'ml',
    );
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('"Date","Time","Drink","Amount (ml)","Counts as (ml)","Caffeine (mg)","Electrolytes (mg)","Sugar (g)"');
    expect(lines[1]).toBe('"2026-10-14","07:05","Say ""hi""","473","473","","",""');
    expect(lines[2].startsWith('"2026-10-15","09:05","Coffee","237","237","95"')).toBe(true);
  });

  it('is only the header with nothing logged', () => {
    expect(drinksCsv([], defaultDrinkProfiles(), 'oz').split('\r\n').filter(Boolean)).toHaveLength(1);
  });
});
