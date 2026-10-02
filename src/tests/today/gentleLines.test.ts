import { describe, expect, it } from 'vitest';
import { gentleLineFor, gentleLines } from '../../core/stoic/gentleLines';

describe('gentle lines', () => {
  it('stays the same through a day and comes from the list', () => {
    expect(gentleLineFor('2026-10-02')).toBe(gentleLineFor('2026-10-02'));
    expect(gentleLines).toContain(gentleLineFor('2026-10-02'));
  });
});
