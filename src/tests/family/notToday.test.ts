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
    expect(state).toEqual({ day: '2026-10-29', keys: ['plant:p1'], done: [], titles: {} });
  });

  it('brings one back without touching the rest, and adds a key once', () => {
    let state = withAside(null, '2026-10-29', 'a');
    state = withAside(state, '2026-10-29', 'b');
    state = withAside(state, '2026-10-29', 'a');
    expect(state.keys).toEqual(['a', 'b']);
    expect(withoutAside(state, '2026-10-29', 'a').keys).toEqual(['b']);
  });
});

describe('Done here', () => {
  it('keeps a line done for the day, with the names of what was set aside', async () => {
    const { marksOn, withAside, withDone, withoutDone } = await import('../../app/family/notToday');
    let state = withAside(null, '2026-10-29', 'run:r1', 'Easy run');
    state = withDone(state, '2026-10-29', 'bills:b1');
    expect(marksOn(state, '2026-10-29')).toEqual({ aside: ['run:r1'], done: ['bills:b1'], titles: { 'run:r1': 'Easy run' } });
    expect(marksOn(withoutDone(state, '2026-10-29', 'bills:b1'), '2026-10-29').done).toEqual([]);
    expect(marksOn(state, '2026-10-30')).toEqual({ aside: [], done: [], titles: {} });
  });
});
