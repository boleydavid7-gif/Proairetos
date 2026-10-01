import { describe, expect, it } from 'vitest';
import { greeting } from '../../features/today/greeting';

const at = (hour: number) => new Date(2026, 9, 1, hour, 30);

describe('greeting', () => {
  it('follows the local clock', () => {
    expect(greeting(at(6))).toBe('Good morning');
    expect(greeting(at(13))).toBe('Good afternoon');
    expect(greeting(at(19))).toBe('Good evening');
  });

  it('stays neutral overnight, when shifts can start or end', () => {
    expect(greeting(at(2))).toBe('Hello');
    expect(greeting(at(23))).toBe('Good evening');
  });
});
