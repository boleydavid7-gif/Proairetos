import { describe, expect, it } from 'vitest';
import { daysOf, entryTitle, moneyText, moveAmong, nextUp, nightsOf, planText, phaseOf, phaseText, readAmount, sortTrips, tripTotals, type Booking, type PlanItem, type Trip } from '../../poreia/core/model';
import { accrualDates, balanceOn, daysOff, hoursFor, leftAfter, shiftsToReplace, type TimeOff, type TimeOffSetup } from '../../poreia/core/timeOff';
import { searchLinks } from '../../poreia/core/links';
import { pickAirport, type Element as AirportElement } from '../../poreia/core/airports';
import { datesIn, readConfirmation, timesIn } from '../../poreia/core/confirmations';
import { suggestedPacking } from '../../poreia/core/packing';
import { poreiaEvents, tripEvents } from '../../poreia/core/calendar';
import { buildIcs } from '../../core/calendar/ics';

const stamp = '2026-10-01T00:00:00.000Z';
const trip = (over: Partial<Trip> = {}): Trip => ({ id: 't1', name: 'Lisbon', travelers: 2, stage: 'planning', createdAt: stamp, updatedAt: stamp, ...over });
const booking = (over: Partial<Booking>): Booking => ({ id: 'b', tripId: 't1', kind: 'other', title: 'x', createdAt: stamp, updatedAt: stamp, ...over });
const off = (over: Partial<TimeOff>): TimeOff => ({ id: 'o', title: 'Lisbon', start: '2026-11-02', end: '2026-11-06', status: 'approved', hours: 40, createdAt: stamp, updatedAt: stamp, ...over });

describe('trips', () => {
  it('says where a trip stands', () => {
    const t = trip({ start: '2026-11-02', end: '2026-11-08' });
    expect(phaseText(phaseOf(t, '2026-10-21'))).toBe('In 12 days');
    expect(phaseText(phaseOf(t, '2026-11-01'))).toBe('Tomorrow');
    expect(phaseText(phaseOf(t, '2026-11-04'))).toBe('Day 3 of 7');
    expect(phaseText(phaseOf(t, '2026-11-09'))).toBe('Back yesterday');
    expect(phaseText(phaseOf(trip(), '2026-11-09'))).toBe('No dates yet');
    expect(nightsOf(t)).toBe(6);
  });

  it('orders trips: on now, soonest ahead, ideas, then past', () => {
    const list = [trip({ id: 'a', start: '2027-01-01' }), trip({ id: 'b', start: '2026-12-01' }), trip({ id: 'c' }), trip({ id: 'd', start: '2026-10-01', end: '2026-10-05' }), trip({ id: 'e', start: '2026-10-20', end: '2026-10-25' })];
    const sorted = sortTrips(list, '2026-10-21');
    expect(sorted.now.map((x) => x.id)).toEqual(['e']);
    expect(sorted.ahead.map((x) => x.id)).toEqual(['b', 'a']);
    expect(sorted.someday.map((x) => x.id)).toEqual(['c']);
    expect(sorted.past.map((x) => x.id)).toEqual(['d']);
  });

  it('lays out each day with bookings and plans in time order', () => {
    const t = trip({ start: '2026-11-02', end: '2026-11-04' });
    const bookings = [
      booking({ id: 's', kind: 'stay', title: 'Casa Azul', startDate: '2026-11-02', startTime: '15:00', endDate: '2026-11-04', endTime: '11:00' }),
      booking({ id: 'f', kind: 'flight', title: 'TP 202', startDate: '2026-11-02', startTime: '08:30' }),
    ];
    const plans: PlanItem[] = [{ id: 'p', tripId: 't1', date: '2026-11-03', title: 'Belém', createdAt: stamp, updatedAt: stamp }];
    const days = daysOf(t, bookings, plans);
    expect(days.map((d) => d.date)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
    expect(days[0].entries.map(entryTitle)).toEqual(['TP 202', 'Check-in: Casa Azul']);
    expect(days[1].entries.map(entryTitle)).toEqual(['Belém']);
    expect(days[2].entries.map(entryTitle)).toEqual(['Check-out: Casa Azul']);
  });

  it('reads and shows money', () => {
    expect(readAmount('$1,240.50')).toBe(124050);
    expect(readAmount('12,50 €')).toBe(1250);
    expect(readAmount('1.240,50')).toBe(124050);
    expect(readAmount('none')).toBeUndefined();
    expect(moneyText({ cents: 124000, currency: 'USD' }, 'en-US')).toBe('$1,240');
    const totals = tripTotals([{ kind: 'stay', cost: { cents: 50000, currency: 'EUR' } }, { kind: 'flight', cost: { cents: 90000, currency: 'USD' } }, { kind: 'tour', cost: { cents: 100, currency: 'XYZ' } }], [{ category: 'food', amount: { cents: 2000, currency: 'USD' } }], 'USD', { EUR: 1.1 });
    expect(totals.booked).toBe(145000);
    expect(totals.spent).toBe(2000);
    expect(totals.byCategory.get('stay')).toBe(55000);
    expect(totals.unconverted).toEqual([{ cents: 100, currency: 'XYZ' }]);
  });
});

describe('time off', () => {
  const setup: TimeOffSetup = { balance: 40, asOf: '2026-10-01', accrual: 6, every: 'two-weeks', from: '2026-10-09', dayHours: 8, workDays: [] };

  it('finds accrual days for each rhythm', () => {
    expect(accrualDates(setup, '2026-10-01', '2026-11-10')).toEqual(['2026-10-09', '2026-10-23', '2026-11-06']);
    expect(accrualDates({ every: 'month', from: '2026-01-31' }, '2026-01-31', '2026-04-30')).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
    expect(accrualDates({ every: 'half-month', from: '2026-01-01' }, '2025-12-31', '2026-02-20')).toEqual(['2026-01-01', '2026-01-16', '2026-02-01', '2026-02-16']);
    expect(accrualDates({ every: 'none', from: '2026-01-01' }, '2025-12-31', '2027-01-01')).toEqual([]);
  });

  it('projects the balance with accruals, time off and a cap', () => {
    const offs = [off({ id: 'a', start: '2026-11-02', hours: 40 }), off({ id: 'b', start: '2026-12-01', end: '2026-12-01', hours: 8, status: 'planned' })];
    expect(balanceOn(setup, offs, '2026-10-31')).toBe(52);
    expect(balanceOn(setup, offs, '2026-11-02')).toBe(12);
    expect(balanceOn(setup, offs, '2026-12-01')).toBe(24);
    expect(balanceOn(setup, offs, '2026-12-01', true)).toBe(16);
    expect(balanceOn({ ...setup, cap: 50 }, [], '2026-11-10')).toBe(50);
    // Canceled time off and time off before the balance date take nothing.
    expect(balanceOn(setup, [off({ status: 'canceled' }), off({ id: 'old', start: '2026-09-01', end: '2026-09-02' })], '2026-10-02')).toBe(40);
    const left = leftAfter(setup, offs, offs[1]);
    expect(left).toEqual({ before: 24, after: 16 });
  });

  it('counts hours from work shifts, or from usual days without a schedule', () => {
    const shifts = [
      { patternId: 'w', date: '2026-11-02', hours: 12 },
      { patternId: 'w', date: '2026-11-03', hours: 12 },
      { patternId: 'w', date: '2026-11-09', hours: 12 },
    ];
    expect(hoursFor('2026-11-02', '2026-11-04', shifts, setup, true)).toBe(24);
    // A whole week takes a full week off, however the shifts fall in it.
    expect(hoursFor('2026-11-02', '2026-11-08', shifts, setup, true)).toBe(40);
    expect(hoursFor('2026-11-02', '2026-11-09', shifts, { ...setup, weekHours: 36 }, true)).toBe(48);
    expect(hoursFor('2026-11-02', '2026-11-08', [], { dayHours: 7.5, workDays: [1, 2, 3, 4, 5] }, false)).toBe(37.5);
    expect(hoursFor('2026-11-02', '2026-11-03', [], { dayHours: 8, workDays: [] }, false)).toBe(16);
    // Public holidays take nothing: on a day left over, and off a whole week.
    const weekdays = { dayHours: 8, workDays: [1, 2, 3, 4, 5] };
    expect(hoursFor('2026-11-25', '2026-11-27', [], weekdays, false, new Set(['2026-11-26']))).toBe(16);
    expect(hoursFor('2026-11-23', '2026-11-29', [], weekdays, false, new Set(['2026-11-26']))).toBe(32);
    expect(hoursFor('2026-11-23', '2026-11-29', [], weekdays, false, new Set(['2026-11-28']))).toBe(40);
    expect(shiftsToReplace('2026-11-02', '2026-11-08', [...shifts, shifts[0]])).toEqual([
      { patternId: 'w', date: '2026-11-02' },
      { patternId: 'w', date: '2026-11-03' },
    ]);
  });

  it('marks the year with the strongest status per day', () => {
    const days = daysOff([off({ start: '2026-12-30', end: '2027-01-02', status: 'planned' }), off({ id: 'x', start: '2026-12-31', end: '2026-12-31' })], 2026);
    expect([...days.entries()]).toEqual([
      ['2026-12-30', 'planned'],
      ['2026-12-31', 'approved'],
    ]);
  });
});

describe('booking links', () => {
  it('fills in place, dates and travelers', () => {
    const stays = searchLinks('stays', { to: 'Lisbon, Portugal', start: '2026-11-02', end: '2026-11-08', travelers: 2 });
    expect(stays[0].url).toBe('https://www.booking.com/searchresults.html?ss=Lisbon%2C%20Portugal&checkin=2026-11-02&checkout=2026-11-08&group_adults=2&no_rooms=1');
    expect(stays.find((l) => l.site === 'Airbnb')!.url).toContain('/s/Lisbon%2C%20Portugal/homes?adults=2&checkin=2026-11-02&checkout=2026-11-08');
    const flights = searchLinks('flights', { to: 'LIS', from: 'JFK', start: '2026-11-02', end: '2026-11-08', travelers: 2 });
    expect(flights.map((l) => l.site)).toEqual(['Google Flights', 'Kayak', 'Skyscanner', 'Momondo', 'Expedia']);
    expect(flights[1].url).toBe('https://www.kayak.com/flights/JFK-LIS/2026-11-02/2026-11-08/2adults');
    expect(flights[3].url).toBe('https://www.momondo.com/flight-search/JFK-LIS/2026-11-02/2026-11-08/2adults');
    // Without codes, the sites that need them open at their front page.
    const plain = searchLinks('flights', { to: 'Lisbon' });
    expect(plain.map((l) => [l.site, Boolean(l.front)])).toEqual([['Google Flights', false], ['Kayak', true], ['Skyscanner', true]]);
    // Codes found from the map fill the same searches as typed ones.
    const found = searchLinks('flights', { to: 'Lisbon, Portugal', from: 'Denver', toCode: 'LIS', fromCode: 'DEN', start: '2026-11-02' });
    expect(found.find((l) => l.site === 'Kayak')!.url).toBe('https://www.kayak.com/flights/DEN-LIS/2026-11-02/1adults');
    expect(searchLinks('cars', { to: 'Lisbon', toCode: 'LIS', start: '2026-11-02', end: '2026-11-08' })[0].url).toBe('https://www.kayak.com/cars/LIS/2026-11-02/2026-11-08');
    expect(searchLinks('trains', { to: 'Boston', from: 'New York', country: 'us' }).map((l) => l.site)).toContain('Amtrak');
    expect(searchLinks('trains', { to: 'Porto', from: 'Lisbon', country: 'PT' }).map((l) => l.site)).toContain('Trainline');
    expect(searchLinks('ferries', { to: 'Naxos', from: 'Athens' })[0].site).toBe('Rome2rio');
    expect(searchLinks('stays', { to: ' ' })).toEqual([]);
  });
});

describe('confirmations', () => {
  it('finds dates and times written many ways', () => {
    expect(datesIn('Wed, Nov 4, 2026 and 2026-11-08 and 5 December', 2026).map((d) => d.date)).toEqual(['2026-11-04', '2026-11-08', '2026-12-05']);
    expect(datesIn('25/12/2026').map((d) => d.date)).toEqual(['2026-12-25']);
    expect(timesIn('Departs 8:05 PM, arrives 07:40').map((t) => t.time)).toEqual(['20:05', '07:40']);
  });

  it('reads a flight', () => {
    const text = `Your trip is confirmed
Confirmation code: QX7P2L
Delta DL 104
New York (JFK) to Lisbon (LIS)
Departs Nov 2, 2026 at 8:05 PM
Arrives Nov 3, 2026 at 8:20 AM
Total: $1,234.56`;
    expect(readConfirmation(text, 2026)).toMatchObject({
      kind: 'flight',
      provider: 'Delta',
      confirmation: 'QX7P2L',
      from: 'JFK',
      to: 'LIS',
      startDate: '2026-11-02',
      startTime: '20:05',
      endDate: '2026-11-03',
      endTime: '08:20',
      cost: { cents: 123456, currency: 'USD' },
    });
  });

  it('reads a stay', () => {
    const text = `Airbnb
Reservation confirmed. Confirmation code HMABC12345
Sunny loft near Alfama
Check-in Mon, Nov 2 after 3:00 PM
Checkout Sun, Nov 8 before 11:00 AM
Total (EUR) € 640,00`;
    expect(readConfirmation(text, 2026)).toMatchObject({
      kind: 'stay',
      provider: 'Airbnb',
      confirmation: 'HMABC12345',
      title: 'Sunny loft near Alfama',
      startDate: '2026-11-02',
      startTime: '15:00',
      endDate: '2026-11-08',
      endTime: '11:00',
      cost: { cents: 64000, currency: 'EUR' },
    });
  });

  it('reads schema.org reservation markup', () => {
    const json = JSON.stringify({ '@context': 'http://schema.org', '@type': 'LodgingReservation', reservationNumber: 'ABC123', reservationFor: { '@type': 'LodgingBusiness', name: 'Hotel Avenida', address: { streetAddress: 'Av. da Liberdade 1', addressLocality: 'Lisbon' } }, checkinDate: '2026-11-02T15:00:00', checkoutDate: '2026-11-05', totalPrice: '480.00', priceCurrency: 'EUR' });
    expect(readConfirmation(`<script type="application/ld+json">${json}</script>`)).toMatchObject({ kind: 'stay', title: 'Hotel Avenida', confirmation: 'ABC123', startDate: '2026-11-02', startTime: '15:00', endDate: '2026-11-05', address: 'Av. da Liberdade 1, Lisbon', cost: { cents: 48000, currency: 'EUR' } });
  });

  it('leaves text with nothing bookable', () => {
    expect(readConfirmation('Thanks for reading our newsletter!')).toBeUndefined();
  });
});

describe('packing', () => {
  it('fits the trip', () => {
    const list = suggestedPacking({ nights: 6, abroad: true, low: 1, high: 15, rain: true, kinds: ['flight', 'car'] }).map((item) => item.name);
    expect(list).toEqual(expect.arrayContaining(['Passport', 'Plug adapter', 'Boarding passes', 'Driver’s license for the rental', 'Warm jacket', 'Hat and gloves', 'Rain jacket or umbrella', '7 × socks']));
    expect(list).not.toContain('Swimwear');
    const home = suggestedPacking({ nights: 1, abroad: false, kinds: [] }).map((item) => item.name);
    expect(home).not.toContain('Passport');
    expect(home).toContain('2 × socks');
  });
});

describe('calendar for Proairetos', () => {
  it('gives trips, time off and timed bookings', () => {
    const events = poreiaEvents(
      [trip({ start: '2026-11-02', end: '2026-11-08', place: { name: 'Lisbon', label: 'Lisbon, Portugal' } })],
      [off({}), off({ id: 'p', status: 'planned', start: '2026-12-01', end: '2026-12-01' }), off({ id: 'c', status: 'canceled' })],
      [booking({ id: 'f', kind: 'flight', title: 'DL 104', startDate: '2026-11-02', startTime: '20:05', from: 'JFK', to: 'LIS' }), booking({ id: 'x', tripId: 'gone', startDate: '2026-11-02', startTime: '10:00' })],
      new Date(2026, 9, 1),
      new Date(2027, 0, 1),
    );
    expect(events.map((e) => e.title)).toEqual(['Lisbon', 'Time off', 'Time off (planned)', 'Flight: DL 104']);
    expect(events[0]).toMatchObject({ date: '2026-11-02', dateEnd: '2026-11-09', location: 'Lisbon, Portugal' });
    expect(events[3]).toMatchObject({ location: 'JFK → LIS' });
  });
});

describe('next up and the plan as text', () => {
  const t = trip({ start: '2026-11-10', end: '2026-11-12' });
  const plan = (over: Partial<PlanItem>): PlanItem => ({ id: 'p', tripId: 't1', date: '2026-11-10', title: 'x', createdAt: stamp, updatedAt: stamp, ...over });
  const days = daysOf(
    t,
    [booking({ id: 'f', kind: 'flight', title: 'TP 210', startDate: '2026-11-10', startTime: '08:10', from: 'JFK', to: 'LIS', confirmation: 'ABC123' }), booking({ id: 's', kind: 'stay', title: 'Casa Azul', startDate: '2026-11-10', startTime: '15:00', endDate: '2026-11-12', address: 'Rua A 1' })],
    [plan({ id: 'a', title: 'Fado night', date: '2026-11-11', time: '21:30', where: 'Alfama' }), plan({ id: 'b', title: 'Pastéis', date: '2026-11-11' })],
  );

  it('finds the next entry from now', () => {
    expect(nextUp(days, '2026-11-01', '12:00')?.entry).toMatchObject({ kind: 'booking', booking: { id: 'f' } });
    expect(nextUp(days, '2026-11-10', '09:00')?.entry).toMatchObject({ kind: 'booking', booking: { id: 's' } });
    expect(nextUp(days, '2026-11-10', '16:00')).toMatchObject({ date: '2026-11-11', entry: { kind: 'plan', item: { id: 'a' } } });
    expect(nextUp(days, '2026-11-11', '22:00')?.entry).toMatchObject({ kind: 'plan', item: { id: 'b' } });
    expect(nextUp(days, '2026-11-13', '09:00')).toBeUndefined();
  });

  it('writes the plan day by day', () => {
    const text = planText(t, days, (date) => date, (time) => time ?? '');
    expect(text.split('\n')).toEqual([
      'Lisbon',
      '',
      '2026-11-10',
      '08:10 TP 210 · JFK → LIS · confirmation ABC123',
      '15:00 Check-in: Casa Azul · Rua A 1',
      '',
      '2026-11-11',
      '21:30 Fado night · Alfama',
      '• Pastéis',
      '',
      '2026-11-12',
      '• Check-out: Casa Azul',
    ]);
  });
});

describe('the order of a day and the trip as a calendar file', () => {
  const plan = (over: Partial<PlanItem>): PlanItem => ({ id: 'p', tripId: 't1', date: '2026-11-10', title: 'x', createdAt: stamp, updatedAt: stamp, ...over });
  const t = trip({ start: '2026-11-10', end: '2026-11-12' });

  it('keeps timed things by time and the rest in the order given', () => {
    const a = plan({ id: 'a', title: 'A', createdAt: '2026-10-01T01:00:00Z' });
    const b = plan({ id: 'b', title: 'B', createdAt: '2026-10-01T02:00:00Z' });
    const c = plan({ id: 'c', title: 'C', time: '09:00' });
    const titles = (list: PlanItem[]) => daysOf(t, [], list)[0].entries.map(entryTitle);
    expect(titles([a, b, c])).toEqual(['C', 'A', 'B']);
    const moved = moveAmong([a, b], 'b', 0);
    expect(moved.map((item) => [item.id, item.order])).toEqual([['b', 0], ['a', 1]]);
    expect(titles([...moved, c])).toEqual(['C', 'B', 'A']);
  });

  it('writes every booking, the check-out and the plans', () => {
    const events = tripEvents(
      t,
      [booking({ id: 'f', kind: 'flight', title: 'TP 210', startDate: '2026-11-10', startTime: '08:10', confirmation: 'ABC123' }), booking({ id: 's', kind: 'stay', title: 'Casa Azul', startDate: '2026-11-10', endDate: '2026-11-12', endTime: '11:00' })],
      [plan({ id: 'a', title: 'Fado night', date: '2026-11-11', time: '21:30' }), plan({ id: 'b', title: 'Pastéis', date: '2026-11-11' })],
    );
    const titles = events.map((event) => event.title).sort();
    expect(titles).toEqual(['Check-out: Casa Azul', 'Fado night', 'Flight: TP 210', 'Lisbon', 'Pastéis', 'Stay: Casa Azul']);
    const text = buildIcs(events, { name: 'Lisbon', now: new Date('2026-10-22T00:00:00Z') });
    expect(text).toContain('SUMMARY:Flight: TP 210');
    expect(text).toContain('DESCRIPTION:Confirmation ABC123');
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(6);
  });
});

describe('airports from the map', () => {
  it('takes an international airport in range before a nearer small one, and skips military fields', () => {
    const elements: AirportElement[] = [
      { lat: 38.78, lon: -9.13, tags: { iata: 'LIS', name: 'Humberto Delgado Airport', 'aerodrome:type': 'international' } },
      { lat: 38.72, lon: -9.14, tags: { iata: 'XXX', name: 'Small field' } },
      { lat: 38.7, lon: -9.15, tags: { iata: 'MIL', name: 'Base', 'aerodrome:type': 'military' } },
      { center: { lat: 38.8, lon: -9.2 }, tags: { name: 'No code' } },
    ];
    expect(pickAirport(elements, 38.72, -9.14)).toEqual({ code: 'LIS', name: 'Humberto Delgado Airport' });
    expect(pickAirport(elements.slice(1), 38.72, -9.14)?.code).toBe('XXX');
    expect(pickAirport([], 0, 0)).toBeUndefined();
  });
});
