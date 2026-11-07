// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { HISTORY_SHARED, localRecords, upkeepForSharing, withOlderHistory } from '../../ktema/app/together';
import type { Thing, Upkeep } from '../../ktema/core/things';
import { things, upkeeps } from '../../ktema/app/state';

const thing = (patch: Partial<Thing> & { id: string }): Thing => ({ name: 'Item', category: 'Home', createdAt: '2026-01-01T00:00:00Z', ...patch });
const upkeep = (patch: Partial<Upkeep> & { id: string }): Upkeep => ({ name: 'Check', every: { count: 1, unit: 'months' }, start: '2026-01-01', history: [], createdAt: '2026-01-01T00:00:00Z', ...patch });

describe('Things and upkeep in a household', () => {
  beforeEach(() => localStorage.clear());

  it('never shares Documents or the upkeep of one', () => {
    things.put(thing({ id: 'a', name: 'Dishwasher', category: 'Appliance' }));
    things.put(thing({ id: 'p', name: 'Passport', category: 'Documents' }));
    upkeeps.put(upkeep({ id: 'u1', thingId: 'a' }));
    upkeeps.put(upkeep({ id: 'u2', thingId: 'p' }));
    upkeeps.put(upkeep({ id: 'u3' }));
    const keys = [...localRecords().keys()].sort();
    expect(keys).toEqual(['thing:a', 'upkeep:u1', 'upkeep:u3']);
  });

  it('seals only the latest history and keeps this phone\'s older entries', () => {
    const history = Array.from({ length: 20 }, (_, index) => ({ date: `2026-02-${String(index + 1).padStart(2, '0')}` }));
    const sent = upkeepForSharing(upkeep({ id: 'u', history }));
    expect(sent.history).toHaveLength(HISTORY_SHARED);
    const merged = withOlderHistory(sent, upkeep({ id: 'u', history }));
    expect(merged.history).toHaveLength(20);
    expect(withOlderHistory(upkeep({ id: 'u', history: history.slice(0, 3) }), upkeep({ id: 'u', history })).history).toHaveLength(3);
  });
});
