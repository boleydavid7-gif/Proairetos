import { describe, expect, it } from 'vitest';
import { handleFlightStatus, readFlights } from '../../../worker/flightStatus';
import { changes, clockAt, flightNumberOf, minutesLate, statusWords, type FlightStatus } from '../../poreia/core/flights';

const raw = [
  {
    number: 'TP 208',
    status: 'Expected',
    airline: { name: 'TAP Air Portugal' },
    aircraft: { model: 'Airbus A321neo' },
    departure: { airport: { iata: 'EWR', shortName: 'Newark' }, scheduledTime: { local: '2026-11-02 18:30-05:00' }, revisedTime: { local: '2026-11-02 19:10-05:00' }, terminal: 'B', gate: 'B52', checkInDesk: '12-18' },
    arrival: { airport: { iata: 'LIS', name: 'Lisbon' }, scheduledTime: { local: '2026-11-03 06:45+00:00' }, baggageBelt: '7' },
  },
];

describe('flight status', () => {
  it('keeps what Poreia shows from the flight data', () => {
    const [flight] = readFlights(raw);
    expect(flight).toEqual({
      number: 'TP 208',
      airline: 'TAP Air Portugal',
      status: 'Expected',
      aircraft: 'Airbus A321neo',
      departure: { airport: 'Newark', code: 'EWR', scheduled: '2026-11-02 18:30-05:00', expected: '2026-11-02 19:10-05:00', actual: undefined, terminal: 'B', gate: 'B52', desk: '12-18', belt: undefined },
      arrival: { airport: 'Lisbon', code: 'LIS', scheduled: '2026-11-03 06:45+00:00', expected: undefined, actual: undefined, terminal: undefined, gate: undefined, desk: undefined, belt: '7' },
    });
    expect(minutesLate(flight.departure)).toBe(40);
    expect(statusWords(flight)).toBe('Delayed 40 min');
    expect(clockAt(flight.departure.scheduled)).toBe('6:30 PM');
  });

  it('names what changed since the last look', () => {
    const [before] = readFlights(raw) as FlightStatus[];
    const after: FlightStatus = { ...before, status: 'Boarding', departure: { ...before.departure, gate: 'B54', expected: '2026-11-02 19:20-05:00' } };
    expect(changes(before, after)).toEqual(['Boarding', 'Now 7:20 PM', 'Gate B54']);
    expect(changes(before, before)).toEqual([]);
    expect(changes(undefined, before)).toEqual([]);
  });

  it('finds the flight number in a booking', () => {
    expect(flightNumberOf({ kind: 'flight', title: 'TAP Air Portugal TP 208 · EWR → LIS' })).toBe('TP208');
    expect(flightNumberOf({ kind: 'flight', title: 'Flight', notes: 'B6 1234 at 7am' })).toBe('B61234');
    expect(flightNumberOf({ kind: 'stay', title: 'TP 208' })).toBeUndefined();
  });

  it('asks only with a number and date, and says when it is not set up', async () => {
    expect((await handleFlightStatus(new Request('https://x/api/travel/flight?number=TP208&date=2026-11-02'), undefined)).status).toBe(503);
    expect((await handleFlightStatus(new Request('https://x/api/travel/flight?number=hello&date=2026-11-02'), 'key')).status).toBe(400);
    let asked = '';
    const fake = (async (url: string) => {
      asked = url;
      return new Response(JSON.stringify(raw));
    }) as typeof fetch;
    const answer = await handleFlightStatus(new Request('https://x/api/travel/flight?number=tp%20208&date=2026-11-02'), 'key', fake);
    expect(asked).toBe('https://aerodatabox.p.rapidapi.com/flights/number/TP208/2026-11-02?withAircraftImage=false&withLocation=false');
    expect(((await answer.json()) as { flights: FlightStatus[] }).flights[0].departure.gate).toBe('B52');
  });
});
