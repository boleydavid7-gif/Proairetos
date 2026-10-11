import { describe, expect, it } from 'vitest';
import { durationText, facts, inYear, yearsOf } from '../../core/year/year';
import { diaitaYear } from '../../diaita/core/year';
import { philiaYear } from '../../philia/core/year';
import { ergonYear } from '../../ergon/core/year';
import { therapeiaYear } from '../../therapeia/core/year';
import { dynamisYear } from '../../dynamis/core/year';
import { ktemaYear } from '../../ktema/core/year';
import type { Person } from '../../philia/core/people';
import type { Chore } from '../../ergon/core/chores';
import type { Thing, Upkeep } from '../../ktema/core/things';

const value = (year: { facts: { label: string; value: string }[] }, label: string) => year.facts.find((fact) => fact.label === label)?.value;

describe('year basics', () => {
  it('reads dates and times, and lists years newest first with this one', () => {
    expect(inYear('2026-03-01', 2026)).toBe(true);
    expect(inYear('2025-12-31T23:00', 2026)).toBe(false);
    expect(inYear(undefined, 2026)).toBe(false);
    expect(yearsOf(['2024-02-01', undefined, '2025-05-05', '2024-09-09'], 2026)).toEqual([2026, 2025, 2024]);
    expect(durationText(45)).toBe('45 min');
    expect(durationText(180)).toBe('3 h');
    expect(durationText(750)).toBe('12 h 30 min');
    expect(facts(['A', '1'], ['B', undefined], ['C', false])).toEqual([{ label: 'A', value: '1' }]);
  });
});

describe('each app', () => {
  it('Diaita: nights, average sleep and the marks given', () => {
    const records = [
      { date: '2026-01-02', bed: '23:00', up: '07:00', how: 'well' as const },
      { date: '2026-01-03', bed: '00:00', up: '07:00', how: 'poorly' as const },
      { date: '2025-12-30', bed: '22:00', up: '06:00' },
    ];
    const year = diaitaYear(records, 2026);
    expect(value(year, 'Nights written down')).toBe('2');
    expect(value(year, 'Average sleep')).toBe('7 h 30 min');
    expect(value(year, 'Marked well')).toBe('1');
    expect(value(year, 'Marked okay')).toBeUndefined();
    expect(diaitaYear(records, 2024)).toEqual({ facts: [], lists: [] });
  });

  it('Philia: times together oldest first and gifts given', () => {
    const person = (name: string, extra: Partial<Person>): Person => ({ id: name, name, notes: [], gifts: [], times: [], createdAt: '2026-01-01T00:00:00Z', ...extra }) as Person;
    const people = [
      person('Ana', { times: [{ id: 't2', date: '2026-05-01', text: 'Walk by the river' }, { id: 't1', date: '2026-02-01', text: '' }], gifts: [{ id: 'g', text: 'A book', at: '2026-01-01', given: '2026-06-01' }] }),
      person('Ben', { times: [{ id: 't3', date: '2025-05-01', text: 'Lunch' }] }),
    ];
    const year = philiaYear(people, 2026);
    expect(value(year, 'Times together')).toBe('2');
    expect(value(year, 'With')).toBe('1 person');
    expect(value(year, 'Gifts given')).toBe('1');
    expect(year.lists[0].lines[0]).toMatch(/Ana$/);
    expect(year.lists[0].lines[1]).toMatch(/Ana: Walk by the river$/);
  });

  it('Ergon: chores done, days, time noted and who did them', () => {
    const chore = (name: string, history: { date: string; by?: string }[], minutes?: number): Chore => ({ id: name, name, repeat: { kind: 'every', count: 1, unit: 'weeks' }, history, minutes, createdAt: '2026-01-01T00:00:00Z' }) as unknown as Chore;
    const year = ergonYear([chore('Bins', [{ date: '2026-01-05', by: 'Sam' }, { date: '2026-01-12', by: 'Alex' }], 10), chore('Hoover', [{ date: '2026-01-05', by: 'Sam' }, { date: '2025-01-05' }])], 2026);
    expect(value(year, 'Chores done')).toBe('3');
    expect(value(year, 'Days')).toBe('2');
    expect(value(year, 'Time, as noted')).toBe('20 min');
    expect(year.lists[0]).toEqual({ title: 'Each chore', lines: ['Bins: 2', 'Hoover: 1'] });
    expect(year.lists[1]).toEqual({ title: 'Who did them', lines: ['Sam: 2', 'Alex: 1'] });
  });

  it('Therapeia: visits that came, questions and readings by kind', () => {
    const visit = (id: string, at: string, questions = 0) => ({ id, with: `Dr ${id}`, at, questions: Array.from({ length: questions }, (_, i) => ({ id: `${id}${i}`, text: 'Q' })), createdAt: at });
    const year = therapeiaYear([visit('A', '2026-03-01T10:00', 2), visit('B', '2026-12-01T10:00', 1)], [{ id: 'r', kind: 'weight', value: 70, unit: 'kg', at: '2026-04-01T08:00:00Z' }] as never, 2026, new Date('2026-10-11T12:00:00'));
    expect(value(year, 'Visits')).toBe('1');
    expect(value(year, 'Questions taken along')).toBe('2');
    expect(year.lists.find((list) => list.title === 'Readings')?.lines).toEqual(['Weight: 1']);
  });

  it('Dynamis: sessions, sets, time and mobility', () => {
    const workout = (date: string, sets: number, minutes?: number) => ({ id: date, date, session: 'A', exercises: [{ exercise: 'squat', name: 'Squat', sets: Array.from({ length: sets }, () => ({ reps: 8 })) }], minutes, createdAt: date });
    const year = dynamisYear([workout('2026-01-01', 3, 40), workout('2026-01-03', 2)], [{ id: 'm', date: '2026-01-02', routine: 'hips', minutes: 10, createdAt: '' }], 2026);
    expect(value(year, 'Sessions')).toBe('2');
    expect(value(year, 'Sets')).toBe('5');
    expect(value(year, 'Time training')).toBe('40 min');
    expect(value(year, 'Mobility routines')).toBe('1');
    expect(year.lists[0].lines).toEqual(['Squat: 5']);
  });

  it('Ktema: upkeep done (not skipped), costs as written, things bought', () => {
    const things = [{ id: 'car', name: 'Car', category: 'Car', boughtOn: '2026-02-01', price: '$9,000', createdAt: '' }] as Thing[];
    const upkeeps = [{ id: 'u', name: 'Oil change', thingId: 'car', every: { count: 6, unit: 'months' }, start: '2026-01-01', history: [{ date: '2026-04-01', cost: '$40' }, { date: '2026-10-01', skipped: true }], createdAt: '' }] as Upkeep[];
    const year = ktemaYear(things, upkeeps, 2026);
    expect(value(year, 'Upkeep done')).toBe('1');
    expect(value(year, 'With a cost noted')).toBe('1');
    expect(value(year, 'Things bought')).toBe('1');
    expect(year.lists[0].lines[0]).toMatch(/Oil change \(Car\) · \$40$/);
  });
});
