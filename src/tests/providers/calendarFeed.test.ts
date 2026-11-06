// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { poreiaEvents } from '../../poreia/core/calendar';
import type { Booking, PlanItem, Trip } from '../../poreia/core/model';

/*
 * The published calendar still carries Poreia exactly as before the calendar providers: the same events, with the notes
 * and confirmation codes that file has always held, and nothing when the app is not added. Today and Days ahead read
 * Poreia through the provider, which leaves those out; this holds the two apart.
 */
let added = true;
vi.mock('../../app/family/added', () => ({ isAdded: () => added, subscribeAdded: () => () => undefined }));

const day = '2026-11-01T09:00:00.000Z';
const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const trip = { id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, start: '2026-11-07', end: '2026-11-12', travelers: 1, stage: 'booked', createdAt: day, updatedAt: day } as unknown as Trip;
const booking = { id: 'b1', tripId: 'tr1', kind: 'flight', title: 'TP 123', startDate: '2026-11-07', startTime: '08:15', endTime: '10:30', confirmation: 'ABC123', createdAt: day, updatedAt: day } as unknown as Booking;
const plan = { id: 'pn1', tripId: 'tr1', date: '2026-11-07', time: '09:00', title: 'Tram 28', note: 'Bring a jacket', createdAt: day, updatedAt: day } as unknown as PlanItem;
const from = new Date('2026-11-01T00:00:00');
const until = new Date('2026-12-01T00:00:00');

beforeEach(() => {
  localStorage.clear();
  added = true;
  put('poreia:trip:tr1', trip);
  put('poreia:booking:b1', booking);
  put('poreia:plan:pn1', plan);
});

describe('the published calendar’s Poreia events', () => {
  it('are the events the calendar has always been given, notes and confirmation included', async () => {
    const { poreiaFeed } = await import('../../app/calendars/poreiaFeed');
    const feed = await poreiaFeed.feedEvents(from, until);
    expect(feed).toEqual(poreiaEvents([trip], [], [booking], from, until, [plan]));
    expect(JSON.stringify(feed)).toContain('Confirmation ABC123');
    expect(JSON.stringify(feed)).toContain('Bring a jacket');
  });
  it('are none while Poreia is not added', async () => {
    added = false;
    const { poreiaFeed } = await import('../../app/calendars/poreiaFeed');
    expect(await poreiaFeed.feedEvents(from, until)).toEqual([]);
  });
  it('are the same records the calendar provider shows, one line for each event, and the provider carries none of the notes', async () => {
    const { poreiaFeed } = await import('../../app/calendars/poreiaFeed');
    const { poreiaCalendar } = await import('../../poreia/providers/calendar');
    const feed = await poreiaFeed.feedEvents(from, until);
    const read = (source: string) => Object.keys(localStorage).filter((key) => key.startsWith(source.slice(6))).map((key) => JSON.parse(localStorage.getItem(key)!));
    const lines = await poreiaCalendar.read({ today: '2026-11-05', now: new Date('2026-11-05T12:00:00'), range: { from, until }, records: async (source: string) => read(source), setting: () => null } as never);
    expect(lines).toHaveLength(feed.length);
    expect(JSON.stringify(lines)).not.toMatch(/ABC123|Bring a jacket|Confirmation/);
  });
});
