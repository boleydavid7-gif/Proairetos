import { upcomingReminders } from '../../app/sync/reminders';
import type { Decision } from '../../core/decisions/types';
import type { LifeItem } from '../../core/life-items/types';

const now = new Date(2026, 9, 1, 12, 0);
const item = (id: string, fields: Partial<LifeItem>): LifeItem => ({
  id, userId: 'u', type: 'DO', title: `Secret title ${id}`, status: 'OPEN', important: false,
  source: 'MANUAL', carried: false, createdAt: '', updatedAt: '', ...fields,
});

describe('reminder times', () => {
  it('sends only times and opaque ids, for scheduled items, check-backs, and look-backs', async () => {
    const items = [
      item('timed', { scheduledAt: new Date(2026, 9, 1, 15).toISOString() }),
      item('past', { scheduledAt: new Date(2026, 9, 1, 9).toISOString() }),
      item('far', { scheduledAt: new Date(2026, 10, 30).toISOString() }),
      item('done', { scheduledAt: new Date(2026, 9, 2).toISOString(), status: 'DONE' }),
      item('waiting', { status: 'WAITING', checkBackAt: new Date(2026, 9, 3).toISOString() }),
    ];
    const decisions: Decision[] = [
      { id: 'd', userId: 'u', question: 'Secret question', options: [], choice: 'x', decidedAt: '', revisitAt: new Date(2026, 9, 5).toISOString() },
    ];
    const reminders = await upcomingReminders(items, decisions, now);

    expect(reminders.map((r) => new Date(r.fire_at).getHours())).toEqual([15, 9, 9]);
    expect(reminders.every((r) => /^[0-9a-f]{32}$/.test(r.id))).toBe(true);
    expect(JSON.stringify(reminders)).not.toMatch(/Secret|timed|waiting/);
  });
});
