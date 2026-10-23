import { describe, expect, it } from 'vitest';
import { readHealthExport, readMoment, splitBatch } from '../../core/health/autoExport';
import { broughtInText, changedRecords, newWorkouts, nightsToWrite } from '../../core/health/fromHealth';

// The shape Health Auto Export sends (REST API, JSON), cut down.
const sample = {
  data: {
    metrics: [
      {
        name: 'sleep_analysis',
        units: 'hr',
        data: [{ date: '2026-10-22 00:00:00 -0700', sleepStart: '2026-10-21 23:12:00 -0700', sleepEnd: '2026-10-22 06:48:00 -0700', inBedStart: '2026-10-21 22:58:00 -0700', inBedEnd: '2026-10-22 06:55:00 -0700', totalSleep: 7.2, deep: 1.1, rem: 1.6, core: 4.5 }],
      },
      { name: 'dietary_water', units: 'fl_oz_us', data: [{ date: '2026-10-22 00:00:00 -0700', qty: 48, source: 'WaterMinder' }] },
      { name: 'weight_body_mass', units: 'lb', data: [{ date: '2026-10-22 07:01:00 -0700', qty: 171.4 }] },
      { name: 'blood_pressure', units: 'mmHg', data: [{ date: '2026-10-22 07:03:00 -0700', systolic: 121, diastolic: 79 }] },
      { name: 'blood_oxygen_saturation', units: '%', data: [{ date: '2026-10-22 02:10:00 -0700', qty: 0.97 }, { date: '2026-10-22 02:40:00 -0700', qty: 0.96 }] },
      { name: 'resting_heart_rate', units: 'count/min', data: [{ date: '2026-10-22 00:00:00 -0700', qty: 54 }] },
      { name: 'heart_rate', units: 'count/min', data: [{ date: '2026-10-22 07:00:00 -0700', Min: 50, Avg: 60, Max: 70 }] },
      { name: 'step_count', units: 'count', data: [{ date: '2026-10-22 00:00:00 -0700', qty: 9000 }] },
    ],
    workouts: [
      {
        id: 'A1B2C3D4-0000-0000-0000-000000000001',
        name: 'Outdoor Run',
        start: '2026-10-22 17:30:00 -0700',
        end: '2026-10-22 18:02:00 -0700',
        duration: 1920,
        distance: { qty: 3.1, units: 'mi' },
        avgHeartRate: { qty: 148, units: 'bpm' },
      },
      { id: 'X', name: 'Traditional Strength Training', start: '2026-10-21 12:00:00 -0700', end: '2026-10-21 12:40:00 -0700', duration: 2400 },
    ],
  },
};

describe('Apple Health export', () => {
  const batch = readHealthExport(sample);

  it('reads the wall time and the instant', () => {
    const moment = readMoment('2026-10-22 17:30:00 -0700')!;
    expect(moment.date).toBe('2026-10-22');
    expect(moment.time).toBe('17:30');
    expect(moment.iso).toBe('2026-10-23T00:30:00.000Z');
    expect(readMoment('soon')).toBeUndefined();
  });

  it('keeps runs, walks, hikes and rides only', () => {
    expect(batch.workouts).toEqual([{ id: 'A1B2C3D4-0000-0000-0000-000000000001', type: 'run', date: '2026-10-22', at: '2026-10-23T00:30:00.000Z', seconds: 1920, meters: 4989, avgHr: 148 }]);
  });

  it('reads a night by the day woken into', () => {
    expect(batch.sleep).toEqual([{ date: '2026-10-22', bed: '23:12', up: '06:48' }]);
  });

  it('joins stages of sleep into one night', () => {
    const stages = readHealthExport({
      data: {
        metrics: [
          {
            name: 'sleep_analysis',
            data: [
              { startDate: '2026-10-21 22:40:00 -0700', endDate: '2026-10-22 07:00:00 -0700', value: 'In Bed' },
              { startDate: '2026-10-21 23:05:00 -0700', endDate: '2026-10-22 01:00:00 -0700', value: 'Core' },
              { startDate: '2026-10-22 01:00:00 -0700', endDate: '2026-10-22 01:20:00 -0700', value: 'Awake' },
              { startDate: '2026-10-22 01:20:00 -0700', endDate: '2026-10-22 06:35:00 -0700', value: 'Deep' },
              { startDate: '2026-10-22 14:00:00 -0700', endDate: '2026-10-22 14:20:00 -0700', value: 'Core' },
            ],
          },
        ],
      },
    });
    expect(stages.sleep).toEqual([{ date: '2026-10-22', bed: '23:05', up: '06:35' }]);
  });

  it('turns water into milliliters and places a day’s total at noon', () => {
    expect(batch.water).toEqual([{ id: 'water-2026-10-22T00:00', at: '2026-10-22T19:00:00.000Z', ml: 1420 }]);
  });

  it('reads readings in their own units, one oxygen an hour', () => {
    expect(batch.readings.map((reading) => [reading.kind, reading.value, reading.value2, reading.unit])).toEqual([
      ['weight', 171.4, undefined, 'lb'],
      ['blood-pressure', 121, 79, 'mmHg'],
      ['oxygen', 97, undefined, '%'],
      ['heart-rate', 54, undefined, 'bpm'],
    ]);
  });

  it('splits a large batch into parts', () => {
    const size = (part: typeof batch) => part.workouts.length + part.sleep.length + part.water.length + part.readings.length;
    const parts = splitBatch(batch, 300);
    expect(parts.reduce((sum, part) => sum + size(part), 0)).toBe(7);
    expect(parts.every((part) => JSON.stringify(part).length < 600)).toBe(true);
    // At most so many parts: the newest records are the ones kept.
    const capped = splitBatch(batch, 1, 2);
    expect(capped).toHaveLength(2);
    expect(capped[0].workouts.length).toBe(1);
  });

  it('reads nothing from something else', () => {
    expect(readHealthExport('nope')).toEqual({ workouts: [], sleep: [], water: [], readings: [] });
  });
});

describe('what is new for each app', () => {
  const run = { id: 'w1', type: 'run', date: '2026-10-22', at: '', seconds: 1920, meters: 4989 };

  it('leaves a workout already logged (by hand, from Strava, or from Health)', () => {
    expect(newWorkouts([run], [])).toEqual([run]);
    expect(newWorkouts([run], [{ id: 'strava-9', date: '2026-10-22', activity: 'run', meters: 5000 }])).toEqual([]);
    expect(newWorkouts([run], [{ id: 'mine', date: '2026-10-22', activity: 'run', seconds: 1900 }])).toEqual([]);
    expect(newWorkouts([run], [{ id: 'health-w1', date: '2026-10-22', activity: 'run' }])).toEqual([]);
    expect(newWorkouts([run], [{ id: 'mine', date: '2026-10-22', activity: 'walk', meters: 4989 }])).toEqual([run]);
  });

  it('never replaces a night written by hand', () => {
    const night = { date: '2026-10-22', bed: '23:12', up: '06:48' };
    expect(nightsToWrite([night], [])).toEqual([night]);
    expect(nightsToWrite([night], [{ date: '2026-10-22', bed: '23:00', up: '07:00' }])).toEqual([]);
    expect(nightsToWrite([night], [{ date: '2026-10-22', bed: '23:00', up: '07:00', from: 'health' }])).toEqual([night]);
    expect(nightsToWrite([night], [{ ...night, from: 'health' }])).toEqual([]);
  });

  it('writes a day’s water again when the total grew', () => {
    const water = { id: 'water-2026-10-22T00:00', at: '', ml: 1420 };
    expect(changedRecords([water], [{ id: 'health-water-2026-10-22T00:00', same: (each) => each.ml === 1420 }])).toEqual([]);
    expect(changedRecords([{ ...water, ml: 1600 }], [{ id: 'health-water-2026-10-22T00:00', same: (each) => each.ml === 1420 }])).toHaveLength(1);
  });

  it('says what came in', () => {
    expect(broughtInText({ workouts: 1, sleep: 2, water: 0, readings: 3 })).toBe('From Apple Health: 1 workout, 2 nights of sleep, 3 readings');
    expect(broughtInText({ workouts: 0, sleep: 0, water: 0, readings: 0 })).toBe('');
  });
});
