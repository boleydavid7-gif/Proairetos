import { beforeEach, describe, expect, it } from 'vitest';
import { handleTravelEvents, readEvents } from '../../../worker/travelEvents';
import { resetRateLimit } from '../../../worker/safeFetch';

const ask = (query: string, ip = '203.0.113.9') => new Request(`https://proairetos.com/api/travel/events${query}`, { headers: { 'cf-connecting-ip': ip } });

describe('events bridge', () => {
  beforeEach(() => resetRateLimit());
  it('says whether it is set up', async () => {
    expect(await (await handleTravelEvents(ask(''), undefined)).json()).toEqual({ ready: false });
    expect(await (await handleTravelEvents(ask(''), 'key')).json()).toEqual({ ready: true });
  });

  it('asks for a place and dates', async () => {
    const response = await handleTravelEvents(ask('?lat=38.7&lon=-9.1&start=nope&end=2026-11-16', '203.0.113.10'), 'key');
    expect(response.status).toBe(400);
  });

  it('passes only the place and dates on, keeping the key on the server', async () => {
    let called = '';
    const fake = (async (url: string) => {
      called = url;
      return new Response(JSON.stringify({ _embedded: { events: [{ id: 'e1', name: 'Fado night', url: 'https://tm/e1', dates: { start: { localDate: '2026-11-12', localTime: '21:30:00' } }, _embedded: { venues: [{ name: 'Clube', city: { name: 'Lisbon' } }] } }] } }));
    }) as unknown as typeof fetch;
    const response = await handleTravelEvents(ask('?lat=38.72&lon=-9.14&start=2026-11-10&end=2026-11-16', '203.0.113.11'), 'secret', fake);
    const body = (await response.json()) as { events: { name: string; time?: string; venue?: string }[] };
    expect(called).toContain('latlong=38.7200%2C-9.1400');
    expect(called).toContain('apikey=secret');
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(body.events[0]).toMatchObject({ name: 'Fado night', time: '21:30', venue: 'Clube, Lisbon' });
  });

  it('reads an empty answer as no events', () => {
    expect(readEvents({})).toEqual([]);
  });
});
