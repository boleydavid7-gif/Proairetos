// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const scheduled: { id: number; title: string; body: string; schedule: { at: Date }; extra: { open: string } }[][] = [];
const canceled: number[][] = [];
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: async () => ({ display: 'granted' }),
    requestPermissions: async () => ({ display: 'granted' }),
    schedule: async ({ notifications }: { notifications: (typeof scheduled)[number] }) => void scheduled.push(notifications),
    cancel: async ({ notifications }: { notifications: { id: number }[] }) => void canceled.push(notifications.map((each) => each.id)),
    addListener: async () => ({ remove: async () => undefined }),
  },
}));

import { isNativeApp } from '../../app/native/platform';
import { scheduleNative } from '../../app/native/localReminders';
import { nativeId } from '../../core/notify/place';
import type { Notice } from '../../core/notify/notices';

const notice = (key: string, minutes: number, open = 'today'): Notice => ({ key, kind: 'item', at: new Date(Date.now() + minutes * 60_000), title: 'Dentist', body: 'In 15 minutes', open });

describe('reminders in the phone app', () => {
  beforeEach(() => {
    scheduled.length = 0;
    canceled.length = 0;
    localStorage.clear();
  });
  afterEach(() => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor;
  });

  it('is only the phone app when the native shell says so', () => {
    expect(isNativeApp()).toBe(false);
    (window as unknown as { Capacitor: unknown }).Capacitor = { isNativePlatform: () => true };
    expect(isNativeApp()).toBe(true);
  });

  it('hands the phone the soonest notices, worded as on the web, and replaces them next time', async () => {
    const many = Array.from({ length: 80 }, (_, i) => notice(`n${i}`, i + 1));
    await scheduleNative([notice('gone', -5), ...many], true);
    expect(scheduled[0]).toHaveLength(60);
    expect(scheduled[0][0]).toMatchObject({ id: nativeId('n0'), title: 'Proairetos', body: 'Dentist · In 15 minutes', extra: { open: 'today' } });
    await scheduleNative([notice('n0', 1, 'therapeia:today')], false);
    expect(canceled[0]).toHaveLength(60);
    expect(scheduled[1][0].title).toBe('Therapeia');
  });
});
