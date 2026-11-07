import { describe, expect, it } from 'vitest';
import { hydrationNotices, setHydrationSchedule } from '../../app/notify/hydrationSchedule';
import { defaultQuietHours } from '../../core/rhythm/quietHours';

const now = new Date(2026, 9, 5, 8, 0);

describe('Hydros reminder schedule', () => {
  it('builds a two-week series through waking hours (7:00 to 22:00 when quiet hours are off)', () => {
    setHydrationSchedule({ enabled: true, intervalMinutes: 120, when: 'waking' });
    const notices = hydrationNotices(now, { ...defaultQuietHours, on: false });

    expect(notices.length).toBe(98);
    expect(notices[0].at).toEqual(new Date(2026, 9, 5, 9, 0));
    expect(notices[1].at).toEqual(new Date(2026, 9, 5, 11, 0));
    expect(notices.every((notice) => notice.at.getHours() >= 7 && notice.at.getHours() < 22)).toBe(true);
    expect(notices.at(-1)?.at.getTime()).toBeLessThanOrEqual(now.getTime() + 14 * 86_400_000);
  });

  it('does not schedule when reminders are off', () => {
    setHydrationSchedule({ enabled: false, intervalMinutes: 120 });
    expect(hydrationNotices(now, defaultQuietHours)).toEqual([]);
  });
});
