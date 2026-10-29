import { describe, expect, it } from 'vitest';
import { asideOn, withAside, withoutAside } from '../../app/family/notToday';

describe('Not today', () => {
  it('keeps a row aside for the day only', () => {
    const state = withAside(null, '2026-10-29', 'plant:p1');
    expect(asideOn(state, '2026-10-29')).toEqual(['plant:p1']);
    expect(asideOn(state, '2026-10-30')).toEqual([]);
  });

  it('starts a new day empty, never carrying yesterday’s list', () => {
    const state = withAside(withAside(null, '2026-10-28', 'chore:c1'), '2026-10-29', 'plant:p1');
    expect(state).toEqual({ day: '2026-10-29', keys: ['plant:p1'] });
  });

  it('brings one back without touching the rest, and adds a key once', () => {
    let state = withAside(null, '2026-10-29', 'a');
    state = withAside(state, '2026-10-29', 'b');
    state = withAside(state, '2026-10-29', 'a');
    expect(state.keys).toEqual(['a', 'b']);
    expect(withoutAside(state, '2026-10-29', 'a').keys).toEqual(['b']);
  });
});
