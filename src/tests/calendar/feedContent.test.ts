// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultFeedOptions } from '../../core/calendar/feedEvents';
import type { ScheduleOccurrence } from '../../core/scheduling/types';

/*
 * What the calendar file holds. An earlier version added every bill (with its amount) and Poreia's trips, bookings and plans
 * (with confirmation codes and notes) whatever the person had switched on. The file now holds the schedule and things the
 * person chose and nothing else, even with bills and trips on the device.
 */
const night: ScheduleOccurrence = { patternId: 'p1', patternName: 'Hospital', kind: 'COMMITTED', label: 'Nights', date: '2026-11-07', start: new Date('2026-11-07T22:00:00Z'), end: new Date('2026-11-08T06:00:00Z'), changed: false };
const listBills = vi.fn(async () => [{ id: 'b1', name: 'Internet', amountCents: 7824, currency: 'USD', dueDate: '2026-11-10', frequency: 'monthly', autopay: false, reminderDays: 3, payments: [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' }]);
vi.mock('../../app/services', () => ({
  scheduleService: { occurrencesBetween: async () => [night] },
  lifeService: { list: async () => [] },
}));
vi.mock('../../oikonomia/data/store', () => ({ listBills }));

const day = '2026-11-01T09:00:00.000Z';
const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('proairetosOwned', JSON.stringify({ apps: ['core'], owner: true, account: true }));
  localStorage.setItem('proairetos.apps', JSON.stringify({ added: ['poreia', 'oikonomia'] }));
  put('poreia:trip:tr1', { id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, start: '2026-11-07', end: '2026-11-12', travelers: 1, stage: 'booked', createdAt: day, updatedAt: day });
  put('poreia:booking:b1', { id: 'b1', tripId: 'tr1', kind: 'flight', title: 'TP 123', startDate: '2026-11-07', startTime: '08:15', endTime: '10:30', confirmation: 'CANARY-CODE', address: 'CANARY-ADDRESS', createdAt: day, updatedAt: day });
  put('poreia:plan:pn1', { id: 'pn1', tripId: 'tr1', date: '2026-11-07', time: '09:00', title: 'Tram 28', note: 'CANARY-NOTE', where: 'CANARY-WHERE', createdAt: day, updatedAt: day });
  put('poreia:off:o1', { id: 'o1', title: 'CANARY-OFF', start: '2026-11-16', end: '2026-11-17', status: 'approved', hours: 16, createdAt: day, updatedAt: day });
});

describe('the calendar file', () => {
  it('holds only the schedule the person chose, with bills and Poreia on the device', async () => {
    const { buildCalendarFile } = await import('../../app/sync/calendarFile');
    const text = await buildCalendarFile(defaultFeedOptions, new Date('2026-11-05T12:00:00Z'));
    expect(text).toContain('SUMMARY:Busy');
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(text).not.toMatch(/Internet|Lisbon|TP 123|Tram|Time off|CANARY|Confirmation|\$|7824|USD|DESCRIPTION|LOCATION|oikonomia|poreia/i);
  });
  it('never reads the bills at all', async () => {
    const { buildCalendarFile } = await import('../../app/sync/calendarFile');
    await buildCalendarFile({ ...defaultFeedOptions, protectedTime: true, tasks: true }, new Date('2026-11-05T12:00:00Z'));
    expect(listBills).not.toHaveBeenCalled();
  });
});
