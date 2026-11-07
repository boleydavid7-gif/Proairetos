import { describe, expect, it } from 'vitest';
import { LIT_STRENGTH, dayLight, dayPosition, poolColor, positionFromSleeps, shadeReads, vellumReads, warmedLamp } from '../../lamplight/daylight';
import { LAMP_SEEDS, ROOM_LAMP, ROOM_SEEDS, makeScheme, type RoomName } from '../../lamplight/scheme';

const at = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return new Date(2026, 9, 23, h, m);
};

describe('dayPosition', () => {
  it('runs from waking to sleep', () => {
    expect(dayPosition(at('07:00'), '07:00', '23:00')).toBe(0);
    expect(dayPosition(at('15:00'), '07:00', '23:00')).toBe(0.5);
    expect(dayPosition(at('23:30'), '07:00', '23:00')).toBe(1);
  });

  it('follows a night worker’s day across midnight', () => {
    // Up at 3 PM, asleep at 7 AM: 6 PM is early in their day, 5 AM late.
    expect(dayPosition(at('18:00'), '15:00', '07:00')).toBeCloseTo(3 / 16);
    expect(dayPosition(at('05:00'), '15:00', '07:00')).toBeCloseTo(14 / 16);
    expect(dayPosition(at('10:00'), '15:00', '07:00')).toBe(1);
  });
});

describe('dayLight', () => {
  it('hangs high and cool early, low and warm late', () => {
    const morning = dayLight(0.2);
    const late = dayLight(0.95);
    expect(late.y).toBeGreaterThan(morning.y);
    expect(late.warmth).toBeGreaterThan(morning.warmth);
    expect(late.pool).toBeLessThan(morning.pool);
    expect(late.shade).toBeGreaterThan(morning.shade);
    expect(morning.name).toBe('Morning');
    expect(late.name).toBe('Before sleep');
  });

  it('moves smoothly, without jumps', () => {
    for (let t = 0; t < 1; t += 0.01) {
      const [a, b] = [dayLight(t), dayLight(t + 0.01)];
      expect(Math.abs(a.y - b.y)).toBeLessThan(0.02);
      expect(Math.abs(a.warmth - b.warmth)).toBeLessThan(0.06);
    }
  });
});

describe('warmedLamp', () => {
  it('keeps the lamp at no warmth and turns it toward amber with warmth', () => {
    expect(warmedLamp(LAMP_SEEDS.Tide, 0)).toEqual(LAMP_SEEDS.Tide);
    const warm = warmedLamp(LAMP_SEEDS.Tide, 1);
    expect(Math.abs(warm.hue - 62)).toBeLessThan(Math.abs(LAMP_SEEDS.Tide.hue - 62));
    // Still mostly its own: Tide stays nearer its blue than amber.
    expect(Math.abs(warm.hue - LAMP_SEEDS.Tide.hue)).toBeLessThan(Math.abs(warm.hue - 62));
  });
});

describe('vellum', () => {
  it('keeps every text role readable on a card’s lit corner, in every room, lamp, mode and hour', () => {
    for (const room of Object.keys(ROOM_SEEDS) as RoomName[]) {
      for (const mode of ['dark', 'light'] as const) {
        for (const t of [0, 0.3, 0.6, 0.9, 1]) {
          const light = dayLight(t);
          const lamp = warmedLamp(LAMP_SEEDS[ROOM_LAMP[room]], light.warmth);
          const s = makeScheme(ROOM_SEEDS[room], lamp, mode);
          expect(vellumReads(s, poolColor(lamp, light.warmth, mode), light.pool * LIT_STRENGTH).ok, `${room} ${mode} ${t}`).toBe(true);
        }
      }
    }
  });
});

describe('positionFromSleeps', () => {
  const sleep = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });
  const nights = [sleep('2026-10-22T23:00', '2026-10-23T07:00'), sleep('2026-10-23T23:00', '2026-10-24T07:00')];

  it('runs from the last sleep to the next', () => {
    expect(positionFromSleeps(new Date('2026-10-23T07:00'), nights)).toBe(0);
    expect(positionFromSleeps(new Date('2026-10-23T15:00'), nights)).toBe(0.5);
  });

  it('stays late inside a sleep and says nothing without one on each side', () => {
    expect(positionFromSleeps(new Date('2026-10-24T02:00'), nights)).toBe(1);
    expect(positionFromSleeps(new Date('2026-10-24T09:00'), nights)).toBeUndefined();
  });

  it('follows a night worker who sleeps through the morning', () => {
    const day = [sleep('2026-10-23T08:00', '2026-10-23T15:00'), sleep('2026-10-24T08:00', '2026-10-24T15:00')];
    expect(positionFromSleeps(new Date('2026-10-23T16:00'), day)!).toBeLessThan(0.1);
  });
});

describe('shade', () => {
  it('keeps secondary text readable on the page’s deepest shade', () => {
    for (const room of Object.keys(ROOM_SEEDS) as RoomName[]) {
      for (const mode of ['dark', 'light'] as const) {
        const s = makeScheme(ROOM_SEEDS[room], warmedLamp(LAMP_SEEDS[ROOM_LAMP[room]], 1), mode);
        expect(shadeReads(s, dayLight(1).shade), `${room} ${mode}`).toBe(true);
      }
    }
  });
});
