import { describe, expect, it } from 'vitest';
import { hourLine, runHourFor, runNotes, WEATHER_SOURCES } from '../../askesis/core/runWeather';

const c = (n: number) => `${Math.round(n)}°`;

describe('run weather', () => {
  it('says nothing on a mild hour', () => {
    expect(runNotes({ temp: 15, feels: 14, uv: 3, aqi: 40, day: true }, c)).toEqual({ notes: [], easier: false });
  });

  it('points to an easier run in strong heat and bad air, with sources', () => {
    const { notes, easier } = runNotes({ temp: 31, feels: 34, uv: 9, aqi: 160, day: true }, c);
    expect(easier).toBe(true);
    expect(notes.map((note) => note.source)).toEqual([WEATHER_SOURCES.heat, WEATHER_SOURCES.air, WEATHER_SOURCES.uv]);
  });

  it('notes warm heat and sensitive air without asking for easier', () => {
    const { notes, easier } = runNotes({ temp: 27, feels: 28, aqi: 120 }, c);
    expect(easier).toBe(false);
    expect(notes).toHaveLength(2);
  });

  it('notes ice and cold, and leaves UV out at night', () => {
    const { notes } = runNotes({ temp: -1, feels: -12, rain: 60, uv: 7, day: false }, c);
    expect(notes.map((note) => note.text)).toEqual([expect.stringContaining('Ice'), expect.stringContaining('Feels like -12°')]);
  });

  it('writes the hour plainly, with only what stands out', () => {
    expect(hourLine({ temp: 20, feels: 20.5, rain: 10, wind: 10 }, '6 PM', c, 'km/h')).toBe('6 PM · 20°');
    expect(hourLine({ temp: 20, feels: 23, rain: 70, wind: 40.2 }, '6 PM', c, 'mph')).toBe('6 PM · 20°, feels 23° · rain 70% · wind 25 mph');
  });

  it('takes the usual run time rounded, else the next whole hour', () => {
    expect(runHourFor('2026-10-22', '06:40', new Date(2026, 9, 22, 5, 0))).toBe('2026-10-22T07:00');
    expect(runHourFor('2026-10-22', '18:10', new Date(2026, 9, 22, 5, 0))).toBe('2026-10-22T18:00');
    expect(runHourFor('2026-10-22', undefined, new Date(2026, 9, 22, 14, 20))).toBe('2026-10-22T15:00');
    expect(runHourFor('2026-10-22', undefined, new Date(2026, 9, 22, 14, 0))).toBe('2026-10-22T14:00');
  });
});
