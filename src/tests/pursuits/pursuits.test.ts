import { describe, expect, it } from 'vitest';
import { inactivityDueAt, needsPursuitCheckIn } from '../../app/pursuits';
import { pursuitNotices } from '../../core/notify/pursuits';

const now = new Date('2026-10-27T12:00:00.000Z');

describe('pursuit check-ins', () => {
  it('uses the latest check-in as the inactivity anchor', () => {
    const pursuit = { status: 'active' as const, createdAt: '2026-10-01T12:00:00.000Z', lastCheckInAt: '2026-10-24T12:00:00.000Z', reminderAfterDays: 7 };
    expect(inactivityDueAt(pursuit)?.toISOString()).toBe('2026-10-31T12:00:00.000Z');
    expect(needsPursuitCheckIn(pursuit, now)).toBe(false);
    expect(needsPursuitCheckIn(pursuit, new Date('2026-11-01T12:00:00.000Z'))).toBe(true);
  });

  it('does not remind for paused, archived, complete, or opted-out pursuits', () => {
    const base = { id: 'p1', title: 'House', createdAt: '2026-10-01T12:00:00.000Z', reminderAfterDays: 7 };
    expect(pursuitNotices([{ ...base, status: 'paused' }, { ...base, id: 'p2', status: 'archived' }, { ...base, id: 'p3', status: 'complete' }, { ...base, id: 'p4', status: 'active', reminderAfterDays: 0 }], now, new Date('2026-11-01'))).toEqual([]);
  });

  it('creates one stable reminder and opens Compass', () => {
    const notices = pursuitNotices([{ id: 'p1', title: 'Make the house calmer', status: 'active', createdAt: '2026-10-01T12:00:00.000Z', reminderAfterDays: 7 }], now, new Date('2026-11-01'));
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: 'pursuit', title: 'Check in: Make the house calmer', body: 'No check-in in 7 days', open: 'compass' });
    expect(notices[0].at).toEqual(now);
    expect(notices[0].key).toContain('pursuit:p1:');
  });
});
