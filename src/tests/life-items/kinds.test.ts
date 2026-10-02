import { describe, expect, it } from 'vitest';
import { kindFields, kindOf, type ItemKind } from '../../core/life-items/kinds';
import { setKind } from '../../core/life-items/commands';
import type { LifeItem } from '../../core/life-items/types';

const ctx = { now: () => new Date('2026-10-02T09:00:00Z'), newId: () => 'e' };
const item: LifeItem = {
  id: 'i', userId: 'u', type: null, title: 't', status: 'OPEN', important: false, source: 'CAPTURE', carried: false,
  createdAt: '', updatedAt: '',
};

describe('one set of kinds', () => {
  it('reads older items into the new kinds', () => {
    expect(kindOf({ type: 'DO' })).toBe('TODO');
    expect(kindOf({ type: 'MAKE_TIME_FOR' })).toBe('TODO');
    expect(kindOf({ type: 'THINKING_ABOUT' })).toBe('CONCERN');
    expect(kindOf({ type: null, captureKind: 'EMOTION' })).toBe('FEELING');
    expect(kindOf({ type: null, captureKind: 'THOUGHT' })).toBe('REMEMBER');
    expect(kindOf({ type: 'DO', captureKind: 'IDEA' })).toBe('TODO');
    expect(kindOf({ type: null })).toBeUndefined();
  });

  it('round-trips every kind through what is stored, recording type changes', () => {
    for (const kind of ['TODO', 'REMEMBER', 'CONCERN', 'IDEA', 'FEELING'] as ItemKind[]) {
      expect(kindOf(kindFields(kind))).toBe(kind);
      const changed = setKind(ctx, item, kind);
      expect(kindOf(changed.item)).toBe(kind);
      expect(changed.events.map((e) => e.kind)).toEqual(['TYPE_CHANGED']);
    }
    const cleared = setKind(ctx, { ...item, type: 'REMEMBER', captureKind: 'IDEA' }, undefined);
    expect(cleared.item.captureKind).toBeUndefined();
    expect(kindOf(cleared.item)).toBeUndefined();
  });
});
