import { beforeEach, describe, expect, it } from 'vitest';
import { partSeen, setShowNotForMe, showNotForMe, setTodayPartShown, startLight, todayHidden } from '../../data/storage/preferences';

beforeEach(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
  });
});

describe('what is included', () => {
  it('starts a new person with a lighter Today', () => {
    startLight();
    expect(todayHidden()).toEqual(['look-ahead', 'open-time', 'a-while-ago', 'close-day']);
  });

  it('never overrides what someone already chose', () => {
    setTodayPartShown('goals', false);
    startLight();
    expect(todayHidden()).toEqual(['goals']);
  });
});

describe('Not for me', () => {
  it('is off until the person turns it on', () => {
    expect(showNotForMe()).toBe(false);
    setShowNotForMe(true);
    expect(showNotForMe()).toBe(true);
  });

  it('is offered only after a part has been around on three days', () => {
    expect(partSeen('path', new Date(2026, 9, 1, 9))).toBe(false);
    expect(partSeen('path', new Date(2026, 9, 1, 18))).toBe(false);
    expect(partSeen('path', new Date(2026, 9, 2, 9))).toBe(false);
    expect(partSeen('path', new Date(2026, 9, 4, 9))).toBe(true);
    expect(partSeen('intention', new Date(2026, 9, 4, 9))).toBe(false);
  });
});
