import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { copyFor, dailyCopiesOn, keepToday, listCopies, setDailyCopies } from '../../data/backup/daily';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  };
}

describe('daily copies', () => {
  it('keeps one copy a day', async () => {
    const factory = new IDBFactory();
    let made = 0;
    const make = async () => `copy ${++made}`;
    expect(await keepToday('2026-10-03', make, factory)).toBe(true);
    expect(await keepToday('2026-10-03', make, factory)).toBe(false);
    expect(made).toBe(1);
    expect(await copyFor('2026-10-03', factory)).toBe('copy 1');
  });

  it('keeps nothing when there is nothing to keep', async () => {
    const factory = new IDBFactory();
    expect(await keepToday('2026-10-03', async () => undefined, factory)).toBe(false);
    expect(await listCopies(factory)).toEqual([]);
  });

  it('keeps the last seven days, newest first', async () => {
    const factory = new IDBFactory();
    for (let day = 1; day <= 10; day += 1) {
      await keepToday(`2026-10-${String(day).padStart(2, '0')}`, async () => `day ${day}`, factory);
    }
    const days = (await listCopies(factory)).map((copy) => copy.day);
    expect(days).toEqual(['2026-10-10', '2026-10-09', '2026-10-08', '2026-10-07', '2026-10-06', '2026-10-05', '2026-10-04']);
    expect(await copyFor('2026-10-03', factory)).toBeUndefined();
  });

  it('is on until switched off', () => {
    const storage = fakeStorage();
    expect(dailyCopiesOn(storage)).toBe(true);
    setDailyCopies(false, storage);
    expect(dailyCopiesOn(storage)).toBe(false);
    setDailyCopies(true, storage);
    expect(dailyCopiesOn(storage)).toBe(true);
  });
});
