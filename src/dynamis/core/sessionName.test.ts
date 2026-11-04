import { describe, expect, it } from 'vitest';
import { sessionName } from './plan';

describe('a logged session\'s name', () => {
  it('follows the plan\'s own sessions', () => {
    expect(sessionName({ days: [1, 3, 5] }, 'A')).toBe('Session A');
    expect(sessionName({ days: [1, 2, 4, 5] }, 'L')).toBe('Lower body');
    expect(sessionName({ days: [1, 3, 5] }, 'X')).toBe('Session');
    expect(sessionName(undefined, 'A')).toBe('Session');
  });
});
