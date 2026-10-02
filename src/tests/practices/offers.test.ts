import { beforeEach, describe, expect, it } from 'vitest';
import { hideOffer, restoreOffers, setQuietOffers, takeOffer } from '../../data/storage/preferences';
import { practices } from '../../core/practices/practices';

function fakeStorage() {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
      key: (i: number) => [...data.keys()][i] ?? null,
      get length() {
        return data.size;
      },
    },
  });
}

describe('quiet offers', () => {
  beforeEach(fakeStorage);

  it('offers at most one thing a day', () => {
    expect(takeOffer('sit-with-it', '2026-10-02')).toBe(true);
    expect(takeOffer('up-to-you', '2026-10-02')).toBe(false);
    expect(takeOffer('up-to-you', '2026-10-03')).toBe(true);
  });

  it('never offers a kind again after "not for me", until restored', () => {
    hideOffer('sit-with-it');
    expect(takeOffer('sit-with-it', '2026-10-02')).toBe(false);
    restoreOffers();
    expect(takeOffer('sit-with-it', '2026-10-02')).toBe(true);
  });

  it('offers nothing when turned off', () => {
    setQuietOffers(false);
    expect(takeOffer('sit-with-it', '2026-10-02')).toBe(false);
  });
});

describe('practices', () => {
  it('each has steps, a close, and a credited source', () => {
    for (const practice of practices) {
      expect(practice.steps.length, practice.id).toBeGreaterThan(1);
      expect(practice.close, practice.id).toBeTruthy();
      expect(practice.source, practice.id).toBeTruthy();
    }
  });
});
