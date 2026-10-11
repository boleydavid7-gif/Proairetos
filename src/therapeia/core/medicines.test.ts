import { describe, expect, it } from 'vitest';
import { atTime } from '../../core/scheduling/dates';
import { defaultRhythm, mainSleeps, type WorkBlock } from '../../diaita/core/rhythm';
import { anchorsFrom, daysLeft, doseAt, dosesOn, isDoseDay, record, refill, refillDay, skip, spacedFrom, supplyLeft, take, takeNow, type Medicine } from './medicines';
import { careNotices, defaultCareNotices } from './notices';

const base = (patch: Partial<Medicine> = {}): Medicine => ({
  id: 'm1',
  name: 'Sertraline',
  dose: '50 mg',
  times: [{ kind: 'clock', at: '08:00' }],
  days: { kind: 'daily' },
  start: '2026-10-01',
  taken: [],
  createdAt: '2026-10-01T08:00:00.000Z',
  ...patch,
});

const block = (date: string, start: string, endDate: string, end: string): WorkBlock => ({ start: atTime(date, start), end: atTime(endDate, end) });
const nights = [block('2026-10-05', '19:00', '2026-10-06', '07:00'), block('2026-10-06', '19:00', '2026-10-07', '07:00')];
const clock = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

describe('dose days', () => {
  it('follows daily, weekday and every-few-days patterns, within a course', () => {
    expect(isDoseDay(base(), '2026-09-30')).toBe(false);
    expect(isDoseDay(base({ days: { kind: 'weekdays', days: [1, 3, 5] } }), '2026-10-05')).toBe(true);
    expect(isDoseDay(base({ days: { kind: 'weekdays', days: [1, 3, 5] } }), '2026-10-06')).toBe(false);
    expect(isDoseDay(base({ days: { kind: 'every', every: 2 } }), '2026-10-03')).toBe(true);
    expect(isDoseDay(base({ days: { kind: 'every', every: 2 } }), '2026-10-04')).toBe(false);
    expect(isDoseDay(base({ end: '2026-10-07' }), '2026-10-08')).toBe(false);
    expect(isDoseDay(base({ stopped: '2026-10-04' }), '2026-10-04')).toBe(false);
  });
});

describe('times around sleep', () => {
  const anchors = anchorsFrom(mainSleeps('2026-10-01', '2026-10-09', nights, defaultRhythm));

  it('puts "on waking" at the usual morning on a day off', () => {
    expect(clock(doseAt({ kind: 'wake', after: 0 }, '2026-10-03', anchors))).toBe('06:00');
    expect(clock(doseAt({ kind: 'sleep', before: 0 }, '2026-10-03', anchors))).toBe('22:30');
  });

  it('goes later the night before a first night, as Diaita plans it', () => {
    const bed = doseAt({ kind: 'sleep', before: 0 }, '2026-10-04', anchors);
    expect(bed.getDate()).toBe(5);
    expect(clock(bed)).toBe('00:30');
  });

  it('moves with the sleep after a night shift', () => {
    // Between nights: asleep 07:30 to 15:00, so waking is at 15:00 and bedtime the next morning after work.
    expect(clock(doseAt({ kind: 'wake', after: 30 }, '2026-10-06', anchors))).toBe('15:30');
    const bed = doseAt({ kind: 'sleep', before: 0 }, '2026-10-06', anchors);
    expect(bed.getDate()).toBe(7);
    expect(clock(bed)).toBe('07:30');
  });

  it('falls back to 07:00 and 22:30 with no sleep known', () => {
    expect(clock(doseAt({ kind: 'wake', after: 0 }, '2026-10-04'))).toBe('07:00');
    expect(clock(doseAt({ kind: 'sleep', before: 30 }, '2026-10-04'))).toBe('22:00');
  });
});

describe('marking doses', () => {
  it('shows each dose of the day with how it was marked', () => {
    const twice = base({ times: [{ kind: 'clock', at: '20:00' }, { kind: 'clock', at: '08:00' }] });
    const marked = take(twice, '2026-10-05#1', atTime('2026-10-05', '08:10'));
    const doses = dosesOn([marked], '2026-10-05');
    expect(doses.map((dose) => dose.label)).toEqual([expect.stringMatching(/8:00/), expect.stringMatching(/8:00/)]);
    expect(doses[0].taken?.slot).toBe('2026-10-05#1');
    expect(doses[1].taken).toBeUndefined();
    // Marking again replaces, never doubles.
    const again = skip(marked, '2026-10-05#1', atTime('2026-10-05', '08:20'));
    expect(again.taken).toHaveLength(1);
    expect(again.taken[0].skipped).toBe(true);
  });

  it('gives the time from which an as-needed dose could come, by the person\'s own spacing', () => {
    const needed = takeNow(base({ times: [], asNeeded: true, gapHours: 4 }), atTime('2026-10-05', '10:00'));
    expect(clock(spacedFrom(needed)!)).toBe('14:00');
    expect(spacedFrom(base({ asNeeded: true }))).toBeUndefined();
  });

  it('keeps a record by day, newest first', () => {
    let medicine = take(base(), '2026-10-05#0', atTime('2026-10-05', '08:05'));
    medicine = skip(medicine, '2026-10-06#0', atTime('2026-10-06', '08:00'));
    expect(record(medicine, '2026-10-06')).toEqual([
      { date: '2026-10-06', taken: [], skipped: 1 },
      { date: '2026-10-05', taken: [expect.stringMatching(/8:05/)], skipped: 0 },
    ]);
  });
});

describe('supply', () => {
  const supplied = base({ times: [{ kind: 'clock', at: '08:00' }, { kind: 'clock', at: '20:00' }], supply: { count: 30, countedAt: atTime('2026-10-01', '00:00').toISOString(), perDose: 1, lead: 5 } });

  it('counts down with doses taken, not skipped ones', () => {
    let medicine = take(supplied, '2026-10-01#0', atTime('2026-10-01', '08:00'));
    medicine = skip(medicine, '2026-10-01#1', atTime('2026-10-01', '20:00'));
    expect(supplyLeft(medicine)).toBe(29);
    expect(daysLeft(medicine)).toBe(14);
  });

  it('reminds lead days before running out, and a refill adds to what is left', () => {
    expect(refillDay(supplied, '2026-10-01')).toBe('2026-10-11');
    const refilled = refill(supplied, 60, new Date('2026-10-02T09:00:00Z'));
    expect(refilled.supply?.count).toBe(90);
  });

  it('asks nothing for a course that ends before the supply would', () => {
    expect(refillDay({ ...supplied, end: '2026-10-05' }, '2026-10-01')).toBeUndefined();
  });
});

describe('notices', () => {
  it('says doses not yet marked, several at one time as one, without names unless chosen', () => {
    const one = base();
    const two = base({ id: 'm2', name: 'Vitamin D', dose: undefined });
    const marked = take(one, '2026-10-06#0', atTime('2026-10-06', '07:50'));
    const now = atTime('2026-10-05', '07:00');
    const until = atTime('2026-10-06', '23:00');
    const plain = careNotices([one, two], [], defaultCareNotices, now, until);
    expect(plain.map((notice) => notice.title)).toEqual(['2 medicines', '2 medicines']);
    const named = careNotices([marked, two], [], { ...defaultCareNotices, names: true }, now, until);
    expect(named.map((notice) => notice.title)).toEqual(['2 medicines', 'Vitamin D']);
    expect(named[0].body).toBe('Sertraline, 50 mg · Vitamin D');
  });

  it('reminds before an appointment', () => {
    const notices = careNotices([], [{ id: 'a1', with: 'Dr Patel', at: '2026-10-07T10:30', where: 'Health centre', questions: [], createdAt: '' }], defaultCareNotices, atTime('2026-10-07', '06:00'), atTime('2026-10-08', '06:00'));
    expect(notices).toHaveLength(1);
    expect(clock(notices[0].at)).toBe('08:30');
    expect(notices[0].body).toMatch(/Health centre/);
  });
});

describe('the shared list', () => {
  it('lists what is taken now, with the health card', async () => {
    const { listText } = await import('./medicines');
    const text = listText([base({ how: 'With food' }), base({ id: 'm2', name: 'Old', stopped: '2026-10-02' }), base({ id: 'm3', name: 'Ibuprofen', dose: undefined, times: [], asNeeded: true })], '2026-10-05', { allergies: 'Penicillin' });
    expect(text).toMatch(/Sertraline 50 mg \(With food\): .*8:00.*every day/);
    expect(text).toMatch(/Ibuprofen: as needed/);
    expect(text).not.toMatch(/Old/);
    expect(text).toMatch(/Allergies: Penicillin/);
  });
});
