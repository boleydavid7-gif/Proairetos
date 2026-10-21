import type { BookingKind, Money } from './model';
import { readAmount } from './model';

/*
 * Reading a booking confirmation the person pasted (an email from an airline, a hotel, Airbnb, a cruise line, a
 * ticket site). Everything found is shown in the form before it is saved; nothing is sent anywhere.
 */

export type ReadBooking = {
  kind: BookingKind;
  title: string;
  provider?: string;
  confirmation?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  from?: string;
  to?: string;
  address?: string;
  cost?: Money;
};

const PROVIDERS: { name: string; kind: BookingKind; words?: RegExp }[] = [
  ...['Delta', 'United', 'American Airlines', 'Southwest', 'JetBlue', 'Alaska Airlines', 'Spirit', 'Frontier', 'Hawaiian Airlines', 'Air Canada', 'WestJet', 'British Airways', 'Virgin Atlantic', 'Lufthansa', 'Air France', 'KLM', 'Iberia', 'TAP Air Portugal', 'Aer Lingus', 'Emirates', 'Qatar Airways', 'Etihad', 'Turkish Airlines', 'Ryanair', 'easyJet', 'Wizz Air', 'Qantas', 'Singapore Airlines', 'Cathay Pacific', 'ANA', 'Japan Airlines', 'Aeroméxico', 'LATAM', 'Avianca', 'Copa'].map((name) => ({ name, kind: 'flight' as const })),
  ...['Airbnb', 'Vrbo', 'Booking.com', 'Hotels.com', 'Marriott', 'Hilton', 'Hyatt', 'IHG', 'Holiday Inn', 'Wyndham', 'Best Western', 'Accor', 'Choice Hotels', 'Four Seasons', 'Radisson'].map((name) => ({ name, kind: 'stay' as const })),
  ...['Hertz', 'Avis', 'Enterprise', 'National', 'Budget', 'Sixt', 'Alamo', 'Thrifty', 'Dollar', 'Europcar', 'Turo'].map((name) => ({ name, kind: 'car' as const, words: new RegExp(`\\b${name}\\b.*\\b(car|rental|pick-?up)\\b|\\b(car|rental|pick-?up)\\b.*\\b${name}\\b`, 'is') })),
  ...['Amtrak', 'Eurostar', 'Trainline', 'Via Rail', 'Deutsche Bahn', 'SNCF', 'Trenitalia', 'Renfe', 'Greyhound', 'FlixBus'].map((name) => ({ name, kind: 'train' as const })),
  ...['Royal Caribbean', 'Carnival', 'Norwegian Cruise Line', 'Princess Cruises', 'Celebrity Cruises', 'Disney Cruise Line', 'MSC Cruises', 'Viking', 'Holland America', 'Virgin Voyages', 'Cunard', 'Oceania Cruises'].map((name) => ({ name, kind: 'cruise' as const })),
  ...['Ticketmaster', 'Eventbrite', 'SeatGeek', 'StubHub', 'AXS', 'Live Nation'].map((name) => ({ name, kind: 'event' as const })),
  ...['GetYourGuide', 'Viator', 'Klook', 'Tiqets'].map((name) => ({ name, kind: 'tour' as const })),
  ...['OpenTable', 'Resy', 'Tock', 'TheFork'].map((name) => ({ name, kind: 'food' as const })),
];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Every date in the text, in the order they appear, as "YYYY-MM-DD" with where it was found. */
export function datesIn(text: string, thisYear = new Date().getFullYear()): { date: string; at: number }[] {
  const found: { date: string; at: number }[] = [];
  const add = (at: number, year: number, month: number, day: number) => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return;
    found.push({ date: `${year}-${pad(month)}-${pad(day)}`, at });
  };
  const yearOf = (raw?: string) => (raw ? (raw.length === 2 ? 2000 + Number(raw) : Number(raw)) : thisYear);
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) add(m.index!, Number(m[1]), Number(m[2]), Number(m[3]));
  // "Nov 4, 2026", "November 4th 2026", "Wed, Nov 4"
  for (const m of text.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?(?:\s+(\d{4}))?\b/gi))
    add(m.index!, yearOf(m[3]), MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, Number(m[2]));
  // "4 November 2026", "04 Nov"
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?(?:\s+(\d{4}))?\b/gi))
    add(m.index!, yearOf(m[3]), MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, Number(m[1]));
  // "11/04/2026" read month-first unless the first number cannot be a month.
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12) add(m.index!, yearOf(m[3]), b, a);
    else add(m.index!, yearOf(m[3]), a, b);
  }
  found.sort((x, y) => x.at - y.at);
  // The same date matched twice at one place (e.g. by two patterns) is kept once.
  return found.filter((each, i) => i === 0 || each.at !== found[i - 1].at);
}

/** Every time in the text as "HH:MM": "3:05 PM", "15:05", "3pm". */
export function timesIn(text: string): { time: string; at: number }[] {
  const out: { time: string; at: number }[] = [];
  for (const m of text.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?\b/gi)) {
    let hour = Number(m[1]) % 12;
    if (m[3].toLowerCase() === 'p') hour += 12;
    out.push({ time: `${pad(hour)}:${m[2] ?? '00'}`, at: m.index! });
  }
  for (const m of text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\s*[ap]\.?m)/gi)) out.push({ time: `${pad(Number(m[1]))}:${m[2]}`, at: m.index! });
  return out.sort((a, b) => a.at - b.at);
}

const after = <T extends { at: number }>(list: T[], at: number, within = 160) => list.find((each) => each.at >= at && each.at - at <= within);

function kindOf(text: string): BookingKind {
  const t = text.toLowerCase();
  if (/\b(embark|disembark|stateroom|sail date|sailing|cruise)\b/.test(t)) return 'cruise';
  if (/\b(boarding pass|flight|airline|departs?|departure)\b/.test(t) && /\b(?:[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?\d{2,4}\b/.test(text)) return 'flight';
  if (/check-?\s?in/.test(t) && /check-?\s?out/.test(t)) return 'stay';
  if (/\b(pick-?up|drop-?off)\b/.test(t) && /\b(car|vehicle|rental)\b/.test(t)) return 'car';
  if (/\b(train|rail|coach \d|platform|carriage)\b/.test(t)) return 'train';
  if (/\b(table for|party of|your reservation at)\b/.test(t)) return 'food';
  if (/\b(tour|experience|activity|meeting point)\b/.test(t)) return 'tour';
  if (/\b(tickets?|admission|venue|doors open|section|row)\b/.test(t)) return 'event';
  if (/\b(hotel|resort|inn|suites|stay|nights?)\b/.test(t)) return 'stay';
  return 'other';
}

function costIn(text: string): Money | undefined {
  const symbols: Record<string, string> = { $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', 'C$': 'CAD', A$: 'AUD' };
  const totals = [...text.matchAll(/\b(?:grand\s+)?total(?:\s+(?:price|cost|paid|charged|amount))?\s*(?:\([^)]*\))?\s*[:-]?\s*([A-Z]{3}|C\$|A\$|[$€£¥])?\s*([\d.,]+)\s*([A-Z]{3}|[€£])?/gi)];
  const pick = totals.at(-1);
  if (!pick) return undefined;
  const cents = readAmount(pick[2]);
  if (!cents) return undefined;
  const mark = pick[1] ?? pick[3] ?? '$';
  const currency = /^[A-Z]{3}$/.test(mark) ? mark : (symbols[mark] ?? 'USD');
  return { cents, currency };
}

function confirmationIn(text: string): string | undefined {
  const found = [
    ...text.matchAll(/\b(?:confirmation|booking|reservation|record locator|itinerary|reference|pnr)(?:\s+(?:code|number|no\.?|#|ref(?:erence)?))?\s*[:#]?\s*\n?\s*([A-Z0-9][A-Z0-9-]{4,19})\b/gi),
    ...text.matchAll(/\b(?:code|ref)\s*[:#]\s*([A-Z0-9]{5,10})\b/gi),
  ];
  // Words such as "confirmed" or "details" are not codes; a code has a digit or is all capitals.
  const value = found.map((m) => m[1]).find((each) => /\d/.test(each) || each === each.toUpperCase());
  return value?.toUpperCase();
}

/** A booking from a confirmation's text. Returns undefined when it reads as nothing bookable. */
export function readConfirmation(text: string, thisYear = new Date().getFullYear()): ReadBooking | undefined {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  if (clean.trim().length < 12) return undefined;
  const fromJson = fromSchema(clean);
  if (fromJson) return fromJson;

  const provider = PROVIDERS.find((each) => (each.words ? each.words.test(clean) : new RegExp(`\\b${each.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(clean)));
  let kind = kindOf(clean);
  if (kind === 'other' && provider) kind = provider.kind;
  const dates = datesIn(clean, thisYear);
  const times = timesIn(clean);
  const out: ReadBooking = { kind, title: '', provider: provider?.name, confirmation: confirmationIn(clean), cost: costIn(clean) };

  const labeled = (label: RegExp) => {
    const m = label.exec(clean);
    if (!m) return {};
    const date = after(dates, m.index, 80)?.date;
    const time = after(times, m.index, 120)?.time;
    return { date, time };
  };

  if (kind === 'stay') {
    const inn = labeled(/check-?\s?in/i);
    const out2 = labeled(/check-?\s?out/i);
    out.startDate = inn.date ?? dates[0]?.date;
    out.startTime = inn.time;
    out.endDate = out2.date ?? dates[1]?.date;
    out.endTime = out2.time;
    const name = clean.match(/^.*\b(hotel|resort|inn|suites|lodge|hostel|apartment|villa|house|cottage|condo|loft)\b.*$/im)?.[0].trim();
    out.title = name && name.length <= 70 ? name : `Stay${provider ? ` with ${provider.name}` : ''}`;
  } else if (kind === 'car') {
    const pick = labeled(/pick-?\s?up/i);
    const drop = labeled(/(drop-?\s?off|return)/i);
    Object.assign(out, { startDate: pick.date ?? dates[0]?.date, startTime: pick.time, endDate: drop.date ?? dates[1]?.date, endTime: drop.time });
    out.title = `${provider?.name ?? 'Car'} rental`;
  } else if (kind === 'cruise') {
    const on = labeled(/(embark|sail(?:ing)? date|departs?)/i);
    const off = labeled(/(disembark|return|arrives?)/i);
    Object.assign(out, { startDate: on.date ?? dates[0]?.date, startTime: on.time, endDate: off.date ?? dates.at(-1)?.date, endTime: off.time });
    const ship = clean.match(/\b(?:ship|aboard|on)\s*[:-]?\s*([A-Z][\w'’ ]{2,40}? of the [A-Z][a-z]+|[A-Z][a-z]+ (?:of|Princess|Spirit|Horizon|Star|Dream|Wonder)[\w ]{0,20})/);
    out.title = ship ? ship[1].trim() : `${provider?.name ?? 'Cruise'}`;
  } else if (kind === 'flight') {
    const number = clean.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b(?![:\d])/);
    const codes = [...clean.matchAll(/\(([A-Z]{3})\)|\b([A-Z]{3})\s*(?:→|->|–|-|to)\s*([A-Z]{3})\b/g)];
    const pair = codes.find((m) => m[2]);
    const singles = codes.filter((m) => m[1]).map((m) => m[1]);
    out.from = pair?.[2] ?? singles[0];
    out.to = pair?.[3] ?? singles[1];
    const dep = labeled(/depart/i);
    const arr = labeled(/arriv/i);
    out.startDate = dep.date ?? dates[0]?.date;
    out.startTime = dep.time ?? times[0]?.time;
    out.endDate = arr.date;
    out.endTime = arr.time;
    const flight = number ? `${number[1]} ${number[2]}` : '';
    out.title = [provider?.name, flight].filter(Boolean).join(' ') || (out.from && out.to ? `${out.from} → ${out.to}` : 'Flight');
    if (out.from && out.to && flight) out.title = `${out.title} · ${out.from} → ${out.to}`;
  } else {
    out.startDate = dates[0]?.date;
    out.startTime = times[0]?.time;
    const first = clean.split('\n').map((line) => line.trim()).find((line) => line.length > 3 && line.length <= 70 && !/^(dear|hi|hello|thank|your|subject|from|to|date)\b/i.test(line));
    out.title = first ?? `${provider?.name ?? 'Booking'}`;
  }
  const where = clean.match(/\b(?:address|location|venue|meeting point)\s*[:-]\s*(.{6,100})/i);
  if (where) out.address = where[1].trim();
  if (!out.startDate && !out.confirmation && !out.provider) return undefined;
  return out;
}

/** Confirmations that carry schema.org markup (Gmail's reservation cards): the facts as the sender wrote them. */
function fromSchema(text: string): ReadBooking | undefined {
  const start = text.indexOf('{');
  if (start < 0 || !/"@type"\s*:\s*"\w*Reservation"/.test(text)) return undefined;
  let data: Record<string, unknown> | undefined;
  for (let end = text.lastIndexOf('}'); end > start && !data; end = text.lastIndexOf('}', end - 1)) {
    try {
      data = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      data = undefined;
    }
  }
  if (!data) return undefined;
  const node = (Array.isArray(data) ? data[0] : data) as Record<string, any>;
  const type = String(node['@type'] ?? '');
  const split = (value?: string) => (value ? { date: value.slice(0, 10), time: value.length >= 16 ? value.slice(11, 16) : undefined } : {});
  const cost = node.totalPrice ? { cents: readAmount(String(node.totalPrice)) ?? 0, currency: String(node.priceCurrency ?? 'USD') } : undefined;
  const base = { confirmation: node.reservationNumber ? String(node.reservationNumber) : undefined, cost: cost?.cents ? cost : undefined };
  if (type === 'FlightReservation') {
    const flight = node.reservationFor ?? {};
    const dep = split(flight.departureTime);
    const arr = split(flight.arrivalTime);
    const airline = flight.airline?.name;
    const from = flight.departureAirport?.iataCode;
    const to = flight.arrivalAirport?.iataCode;
    return { ...base, kind: 'flight', provider: airline, title: [airline, flight.airline?.iataCode && flight.flightNumber ? `${flight.airline.iataCode} ${flight.flightNumber}` : ''].filter(Boolean).join(' ') || 'Flight', from, to, startDate: dep.date, startTime: dep.time, endDate: arr.date, endTime: arr.time };
  }
  if (type === 'LodgingReservation') {
    const inn = split(node.checkinTime ?? node.checkinDate);
    const out = split(node.checkoutTime ?? node.checkoutDate);
    const address = node.reservationFor?.address;
    return { ...base, kind: 'stay', title: node.reservationFor?.name ?? 'Stay', startDate: inn.date, startTime: inn.time, endDate: out.date, endTime: out.time, address: typeof address === 'string' ? address : [address?.streetAddress, address?.addressLocality].filter(Boolean).join(', ') || undefined };
  }
  if (type === 'RentalCarReservation') {
    const pick = split(node.pickupTime);
    const drop = split(node.dropoffTime);
    return { ...base, kind: 'car', provider: node.reservationFor?.rentalCompany?.name, title: `${node.reservationFor?.rentalCompany?.name ?? 'Car'} rental`, startDate: pick.date, startTime: pick.time, endDate: drop.date, endTime: drop.time };
  }
  if (type === 'EventReservation') {
    const when = split(node.reservationFor?.startDate);
    return { ...base, kind: 'event', title: node.reservationFor?.name ?? 'Event', startDate: when.date, startTime: when.time, address: node.reservationFor?.location?.name };
  }
  if (type === 'FoodEstablishmentReservation') {
    const when = split(node.startTime);
    return { ...base, kind: 'food', title: node.reservationFor?.name ?? 'Table', startDate: when.date, startTime: when.time };
  }
  if (type === 'TrainReservation' || type === 'BusReservation') {
    const trip = node.reservationFor ?? {};
    const dep = split(trip.departureTime);
    const arr = split(trip.arrivalTime);
    return { ...base, kind: type === 'TrainReservation' ? 'train' : 'bus', title: trip.trainName ?? trip.busName ?? (type === 'TrainReservation' ? 'Train' : 'Bus'), from: trip.departureStation?.name ?? trip.departureBusStop?.name, to: trip.arrivalStation?.name ?? trip.arrivalBusStop?.name, startDate: dep.date, startTime: dep.time, endDate: arr.date, endTime: arr.time };
  }
  return undefined;
}
