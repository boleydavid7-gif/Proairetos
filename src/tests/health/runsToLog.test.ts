// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

vi.mock('../../app/family/added', () => ({ isAdded: () => true }));

import { applyHealth } from '../../app/health/health';
import { listEntries, startStore } from '../../askesis/data/store';
import type { HealthBatch } from '../../core/health/autoExport';

const batch = (workouts: HealthBatch['workouts']): HealthBatch => ({ workouts, sleep: [], water: [], readings: [] });
const run = { id: 'w1', type: 'run', date: '2026-10-13', at: '2026-10-13T06:30:00Z', seconds: 1800, meters: 5000, avgHr: 151 };

describe('runs from Health go straight to the log', () => {
  it('adds a run with its heart rate, once, and takes it back with undo', async () => {
    await startStore();
    const first = await applyHealth(batch([run]), undefined);
    expect(first.counts.workouts).toBe(1);
    expect(await listEntries()).toMatchObject([{ id: 'health-w1', activity: 'run', meters: 5000, avgHr: 151 }]);

    const again = await applyHealth(batch([run]), undefined);
    expect(again.counts.workouts).toBe(0);
    expect(await listEntries()).toHaveLength(1);

    await first.undo();
    expect(await listEntries()).toHaveLength(0);
  });
});
