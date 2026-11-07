import { describe, expect, it } from 'vitest';
import { clockAt, nightAxis, placeNight } from './nightChart';

describe('night chart axis', () => {
  it('keeps evening-to-morning nights on a noon axis', () => {
    const axis = nightAxis([{ bed: '23:10', up: '07:00' }, { bed: '00:20', up: '07:40' }]);
    expect(axis?.startHour).toBe(12);
    expect(clockAt(axis!, axis!.from)).toBe('23:00');
    expect(clockAt(axis!, axis!.to)).toBe('08:00');
  });

  it('moves the axis so a day sleep after nights never crosses its edge', () => {
    const nights = [{ bed: '08:30', up: '15:00' }, { bed: '23:00', up: '07:00' }];
    const axis = nightAxis(nights)!;
    for (const night of nights) expect(placeNight(night, axis.startHour).to).toBeLessThanOrEqual(1440);
  });

  it('places a night by its length from bedtime', () => {
    expect(placeNight({ bed: '22:30', up: '06:00' }, 12)).toEqual({ from: 630, to: 1080 });
  });
});
