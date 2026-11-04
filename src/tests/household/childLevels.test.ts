import { describe, expect, it } from 'vitest';
import { DEFAULT_CHILD_LEVEL, HOUSEHOLD_APPS, childLevelOf, levelAllows } from '../../core/household/household';

describe('what children can do', () => {
  it('reads, adds and ticks, or removes, by level', () => {
    expect(levelAllows('none', 'read')).toBe(false);
    expect(levelAllows('view', 'read')).toBe(true);
    expect(levelAllows('view', 'write')).toBe(false);
    expect(levelAllows('add', 'write')).toBe(true);
    expect(levelAllows('add', 'remove')).toBe(false);
    expect(levelAllows('edit', 'remove')).toBe(true);
  });

  it('starts everyday lists open to adding and keeps money, trips and medicines closed', () => {
    for (const { app } of HOUSEHOLD_APPS) expect(DEFAULT_CHILD_LEVEL[app]).toBeDefined();
    expect(childLevelOf({}, 'soma')).toBe('add');
    expect(childLevelOf({}, 'oikonomia')).toBe('none');
    expect(childLevelOf({}, 'therapeia')).toBe('none');
    expect(childLevelOf({ soma: 'view' }, 'soma')).toBe('view');
  });
});
