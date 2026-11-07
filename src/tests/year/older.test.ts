import { describe, expect, it } from 'vitest';
import { askesisYear } from '../../askesis/core/year';
import { somaYear } from '../../soma/core/year';
import { oikonomiaYear } from '../../oikonomia/core/year';
import { hydrosYear } from '../../hydros/core/year';
import { praxisYear } from '../../praxis/year';
import { theoriaYear } from '../../theoria/core/year';

const value = (year: { facts: { label: string; value: string }[] }, label: string) => year.facts.find((fact) => fact.label === label)?.value;

describe('your year in the older apps', () => {
  it('Askesis: logged, days, time, distance and each kind', () => {
    const entry = (date: string, activity: 'run' | 'walk', seconds: number, meters?: number) => ({ id: date + activity, date, activity, seconds, meters, createdAt: date });
    const year = askesisYear([entry('2026-01-01', 'run', 1800, 5000), entry('2026-01-01', 'walk', 1200), entry('2026-02-01', 'run', 3600, 10000), entry('2025-12-31', 'run', 600, 1000)], 2026, 'km');
    expect(value(year, 'Logged')).toBe('3');
    expect(value(year, 'Days')).toBe('2');
    expect(value(year, 'Time')).toBe('1 h 50 min');
    expect(value(year, 'Distance')).toBe('15.0 km');
    expect(value(year, 'Longest')).toBe('10.0 km');
    expect(year.lists[0].lines).toEqual(['Run: 2', 'Walk: 1']);
    expect(askesisYear([], 2026, 'km')).toEqual({ facts: [], lists: [] });
  });

  it('Soma: times cooked, recipes added and who it was cooked for', () => {
    const recipe = (title: string, cooked: string[], createdAt: string, cookedFor?: Record<string, string[]>) => ({ id: title, title, cooked, createdAt, cookedFor }) as never;
    const year = somaYear([recipe('Dal', ['2026-01-01', '2026-02-01', '2025-05-01'], '2025-01-01', { '2026-02-01': ['Mom'] }), recipe('Soup', ['2026-03-01'], '2026-02-20')], 2026);
    expect(value(year, 'Times cooked')).toBe('3');
    expect(value(year, 'Recipes cooked')).toBe('2');
    expect(value(year, 'Recipes added')).toBe('1');
    expect(value(year, 'Cooked for')).toBe('1 person');
    expect(year.lists[0].lines).toEqual(['Dal: 2', 'Soup: 1']);
  });

  it('Oikonomia: payments recorded and spent by area', () => {
    const bills = [{ id: 'b', name: 'Rent', currency: 'USD', payments: [{ id: 'p1', date: '2026-01-01', amountCents: 100000 }, { id: 'p0', date: '2025-12-01', amountCents: 100000 }] }] as never;
    const spent = [{ id: 's', date: '2026-01-05', description: 'Shop', amountCents: 2500, area: 'food' }] as never;
    const year = oikonomiaYear(bills, spent, 'USD', 2026);
    expect(value(year, 'Payments recorded')).toBe('1');
    expect(value(year, 'Paid on bills')).toBe('$1,000.00');
    expect(value(year, 'Spent, from statements')).toBe('$25.00');
    expect(year.lists.find((list) => list.title === 'Spent by area')?.lines).toEqual(['Food: $25.00']);
  });

  it('Hydros: drinks, days and the amount in litres for millilitre people', () => {
    const drink = (id: string, day: string, amountOz: number, kind = 'water') => ({ id, kind, amountOz, loggedAt: `${day}T10:00:00`, createdAt: '' }) as never;
    const year = hydrosYear([drink('a', '2026-01-01', 33.814), drink('b', '2026-01-01', 33.814, 'tea'), drink('c', '2025-01-01', 10)], 2026, 'ml', (each: { loggedAt: string }) => each.loggedAt.slice(0, 10));
    expect(value(year, 'Drinks logged')).toBe('2');
    expect(value(year, 'Days')).toBe('1');
    expect(value(year, 'In all')).toBe('2.0 L');
  });

  it('Praxis: time studied, sessions and each block', () => {
    const focused = (id: string, itemId: string, timestamp: string, minutes: number) => ({ id, itemId, kind: 'FOCUSED', timestamp, metadata: { app: 'praxis', minutes } }) as never;
    const year = praxisYear([focused('1', 'a', '2026-01-01T10:00:00', 25), focused('2', 'a', '2026-01-02T10:00:00', 50), focused('3', 'b', '2025-01-02T10:00:00', 50)], new Map([['a', 'Calculus']]), 2026);
    expect(value(year, 'Time studied')).toBe('1 h 15 min');
    expect(value(year, 'Sessions')).toBe('2');
    expect(year.lists[0].lines).toEqual(['Calculus: 1 h 15 min']);
  });

  it('Theoria: books added and highlights by book', () => {
    const book = { id: 'b', title: 'Meditations', author: 'Marcus Aurelius', createdAt: '2026-01-01', highlights: [{ id: 'h', text: 'x', createdAt: '2026-02-01' }, { id: 'h2', text: 'y', createdAt: '2025-02-01' }], notes: [], reflections: [{ id: 'r', content: 'z', createdAt: '2026-03-01' }] } as never;
    const year = theoriaYear([book], 2026);
    expect(value(year, 'Books added')).toBe('1');
    expect(value(year, 'Highlights')).toBe('1');
    expect(value(year, 'Notes')).toBeUndefined();
    expect(value(year, 'Reflections')).toBe('1');
    expect(year.lists[0].lines).toEqual(['Meditations, Marcus Aurelius: 1']);
  });
});
