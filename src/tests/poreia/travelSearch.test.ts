import { beforeEach, describe, expect, it } from 'vitest';
import { handleTravelSearch, isoMinutes, readFlights, readStays } from '../../../worker/travelSearch';
import { resetRateLimit } from '../../../worker/safeFetch';

const post = (path: string, body: unknown) => new Request(`https://proairetos.com${path}`, { method: 'POST', body: JSON.stringify(body), headers: { origin: 'https://proairetos.com', 'content-type': 'application/json' } });

describe('travel searches through the site', () => {
  beforeEach(() => resetRateLimit());

  it('says which searches are set up', async () => {
    const response = await handleTravelSearch(new Request('https://proairetos.com/api/travel'), { LITEAPI_KEY: 'k' });
    expect(await response.json()).toEqual({ events: false, stays: true, flights: false, status: false, places: false });
  });

  it('answers plainly without a key, and refuses other sites', async () => {
    expect((await handleTravelSearch(post('/api/travel/flights', {}), {})).status).toBe(503);
    const other = new Request('https://proairetos.com/api/travel/stays', { method: 'POST', body: '{}', headers: { origin: 'https://example.com' } });
    expect((await handleTravelSearch(other, { LITEAPI_KEY: 'k' })).status).toBe(403);
  });

  it('passes a stay search on with the key in a header and returns the cheapest rate per hotel', async () => {
    let sent: { url: string; headers: Headers; body: Record<string, unknown> } | undefined;
    const fake = (async (url: string, init: RequestInit) => {
      sent = { url, headers: new Headers(init.headers), body: JSON.parse(String(init.body)) };
      return new Response(
        JSON.stringify({
          data: [
            { hotelId: 'h1', roomTypes: [{ name: 'Double', rates: [{ name: 'Double, breakfast', boardName: 'Breakfast', retailRate: { total: [{ amount: 540.5, currency: 'EUR' }] }, cancellationPolicies: { refundableTag: 'RFN' } }, { name: 'Double', retailRate: { total: [{ amount: 610, currency: 'EUR' }] } }] }] },
            { hotelId: 'h2', roomTypes: [{ rates: [{ name: 'Room', retailRate: { total: [{ amount: 300, currency: 'EUR' }] }, cancellationPolicies: { refundableTag: 'NRFN' } }] }] },
          ],
          hotels: [
            { id: 'h1', name: 'Avenida Palace', stars: 5, rating: 8.9, main_photo: 'https://img/1.jpg', latitude: 38.71, longitude: -9.14 },
            { id: 'h2', name: 'Small Inn', stars: 3 },
          ],
        }),
      );
    }) as unknown as typeof fetch;
    const response = await handleTravelSearch(post('/api/travel/stays', { lat: 38.71, lon: -9.14, checkin: '2026-11-10', checkout: '2026-11-16', adults: 2, currency: 'EUR', nationality: 'US' }), { LITEAPI_KEY: 'secret' }, fake);
    const body = (await response.json()) as { stays: { name: string; price: { amount: number }; refundable?: boolean; board?: string }[] };
    expect(sent!.url).toBe('https://api.liteapi.travel/v3.0/hotels/rates');
    expect(sent!.headers.get('x-api-key')).toBe('secret');
    expect(sent!.body).toMatchObject({ latitude: 38.71, longitude: -9.14, checkin: '2026-11-10', checkout: '2026-11-16', occupancies: [{ adults: 2 }], currency: 'EUR', guestNationality: 'US' });
    expect(body.stays.map((stay) => [stay.name, stay.price.amount])).toEqual([['Small Inn', 300], ['Avenida Palace', 540.5]]);
    expect(body.stays[1]).toMatchObject({ refundable: true, board: 'Breakfast' });
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('checks a stay search before passing it on', async () => {
    expect((await handleTravelSearch(post('/api/travel/stays', { lat: 38.7, lon: -9.1, checkin: '2026-11-16', checkout: '2026-11-10' }), { LITEAPI_KEY: 'k' })).status).toBe(400);
  });

  it('passes a flight search on and reads the offers', async () => {
    let sent: Record<string, unknown> | undefined;
    const fake = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(
        JSON.stringify({
          data: {
            offers: [
              { id: 'o2', total_amount: '820.00', total_currency: 'USD', owner: { name: 'TAP Air Portugal' }, slices: [{ duration: 'PT7H5M', segments: [{ departing_at: '2026-11-09T20:05:00', arriving_at: '2026-11-10T08:10:00', origin: { iata_code: 'JFK' }, destination: { iata_code: 'LIS' }, marketing_carrier: { iata_code: 'TP' }, marketing_carrier_flight_number: '210' }] }] },
              { id: 'o1', total_amount: '640.00', total_currency: 'USD', owner: { name: 'Iberia' }, slices: [{ duration: 'PT10H40M', segments: [{ departing_at: '2026-11-09T18:00:00', arriving_at: '2026-11-10T07:00:00', origin: { iata_code: 'JFK' }, destination: { iata_code: 'MAD' }, marketing_carrier: { iata_code: 'IB' }, marketing_carrier_flight_number: '6252' }, { departing_at: '2026-11-10T09:00:00', arriving_at: '2026-11-10T09:40:00', origin: { iata_code: 'MAD' }, destination: { iata_code: 'LIS' }, marketing_carrier: { iata_code: 'IB' }, marketing_carrier_flight_number: '3100' }] }] },
            ],
          },
        }),
      );
    }) as unknown as typeof fetch;
    const response = await handleTravelSearch(post('/api/travel/flights', { from: 'jfk', to: 'LIS', depart: '2026-11-09', adults: 2 }), { DUFFEL_KEY: 'd' }, fake);
    const body = (await response.json()) as { flights: { airline: string; slices: { stops: number; flights: string[]; minutes: number; from: string; to: string }[] }[] };
    expect((sent!.data as { passengers: unknown[] }).passengers).toHaveLength(2);
    expect(body.flights[0]).toMatchObject({ airline: 'Iberia', slices: [{ from: 'JFK', to: 'LIS', stops: 1, flights: ['IB 6252', 'IB 3100'], minutes: 640 }] });
    expect(body.flights[1].slices[0].stops).toBe(0);
  });

  it('reads durations and leaves out repeated offers', () => {
    expect(isoMinutes('PT2H26M')).toBe(146);
    expect(isoMinutes('P1DT1H')).toBe(1500);
    const offer = { id: 'a', total_amount: '10', total_currency: 'USD', owner: { name: 'X' }, slices: [{ segments: [{ departing_at: 't', arriving_at: 'u' }] }] };
    expect(readFlights({ data: { offers: [offer, { ...offer, id: 'b' }] } })).toHaveLength(1);
    expect(readStays({})).toEqual([]);
  });
});
