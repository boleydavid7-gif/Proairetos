import { describe, expect, it } from 'vitest';
import { hydrationNotices, setHydrationSchedule } from '../../app/notify/hydrationSchedule';
import { defaultQuietHours } from '../../core/rhythm/quietHours';

const now = new Date(2026, 9, 5, 8, 0);

describe('Hydros reminder schedule', () => {
  it('builds a repeating two-week series', () => {
    setHydrationSchedule({ enabled: true, intervalMinutes: 120 });
    const notices = hydrationNotices(now, { ...defaultQuietHours, on: false });

    expect(notices.length).toBe(168);
    expect(notices[0].at).toEqual(new Date(2026, 9, 5, 10, 0));
    expect(notices[1].at).toEqual(new Date(2026, 9, 5, 12, 0));
    expect(notices.at(-1)?.at.getTime()).toBeLessThanOrEqual(now.getTime() + 14 * 86_400_000);
  });

  it('does not schedule when reminders are off', () => {
    setHydrationSchedule({ enabled: false, intervalMinutes: 120 });
    expect(hydrationNotices(now, defaultQuietHours)).toEqual([]);
  });
});
