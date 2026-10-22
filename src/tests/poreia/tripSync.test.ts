import { describe, expect, it } from 'vitest';
import { fingerprint, mergeTrip, sharedId, type SharedRecord } from '../../poreia/core/tripSync';

const plan = (id: string, title: string, updatedAt = '2026-10-01'): SharedRecord => ({ id: sharedId('plan', id), kind: 'plan', record: { id, title, updatedAt } as never });
const map = (...items: SharedRecord[]) => new Map(items.map((item) => [item.id, item]));
const seenOf = (...items: SharedRecord[]) => Object.fromEntries(items.map((item) => [item.id, fingerprint(item.record)]));

describe('a shared trip in step with this phone', () => {
  it('sends what is new here and takes what is new there', () => {
    const merge = mergeTrip(map(plan('a', 'Belém')), map(plan('b', 'Fado')), {});
    expect(merge.toShared.map((item) => item.id)).toEqual(['plan:a']);
    expect(merge.toLocal.map((item) => item.id)).toEqual(['plan:b']);
    expect(Object.keys(merge.seen).sort()).toEqual(['plan:a', 'plan:b']);
  });

  it('lets the side that changed win', () => {
    const was = plan('a', 'Belém');
    const seen = seenOf(was);
    expect(mergeTrip(map(plan('a', 'Belém Tower', '2026-10-02')), map(was), seen).toShared[0].record).toMatchObject({ title: 'Belém Tower' });
    expect(mergeTrip(map(was), map(plan('a', 'Belém at 10', '2026-10-02')), seen).toLocal[0].record).toMatchObject({ title: 'Belém at 10' });
  });

  it('takes the later edit when both changed', () => {
    const seen = seenOf(plan('a', 'Belém'));
    const merge = mergeTrip(map(plan('a', 'Mine', '2026-10-03')), map(plan('a', 'Theirs', '2026-10-02')), seen);
    expect(merge.toShared[0].record).toMatchObject({ title: 'Mine' });
  });

  it('carries a removal across either way', () => {
    const was = plan('a', 'Belém');
    expect(mergeTrip(map(was), map(), seenOf(was)).removeLocal.map((item) => item.id)).toEqual(['plan:a']);
    expect(mergeTrip(map(), map(was), seenOf(was)).removeShared).toEqual(['plan:a']);
  });
});
