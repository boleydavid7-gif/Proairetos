/*
 * Searches on the sites people book with, filled in from the trip: place, dates, how many travel. Poreia never books
 * for the person; it opens the site's own search, and the booking comes back in from the confirmation.
 */

export type SearchKind = 'flights' | 'stays' | 'cars' | 'trains' | 'cruises' | 'events' | 'tours' | 'food';

export const SEARCH_KINDS: { id: SearchKind; label: string }[] = [
  { id: 'stays', label: 'Stays' },
  { id: 'flights', label: 'Flights' },
  { id: 'cars', label: 'Cars' },
  { id: 'trains', label: 'Trains and buses' },
  { id: 'cruises', label: 'Cruises' },
  { id: 'events', label: 'Events' },
  { id: 'tours', label: 'Tours' },
  { id: 'food', label: 'Food' },
];

export type SearchInput = {
  /** Where to: "Lisbon, Portugal". */
  to: string;
  /** Where from, for flights, trains and cruises. */
  from?: string;
  start?: string;
  end?: string;
  travelers?: number;
};

export type SearchLink = { site: string; url: string };

const q = encodeURIComponent;
/** "2026-11-04" → "11/04/2026", as Expedia's searches take dates. */
const us = (date: string) => `${date.slice(5, 7)}/${date.slice(8, 10)}/${date.slice(0, 4)}`;
const isCode = (text?: string) => Boolean(text && /^[A-Z]{3}$/.test(text.trim()));

function google(text: string): SearchLink {
  return { site: 'Google', url: `https://www.google.com/search?q=${q(text)}` };
}

const monthYear = (date?: string) => {
  if (!date) return '';
  const value = new Date(`${date}T12:00:00`);
  return value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/** Where to search for one kind of thing, most used first. */
export function searchLinks(kind: SearchKind, input: SearchInput): SearchLink[] {
  const to = input.to.trim();
  const from = input.from?.trim();
  const people = Math.max(1, input.travelers ?? 1);
  const { start, end } = input;
  if (!to) return [];
  switch (kind) {
    case 'stays': {
      const dates = start && end;
      return [
        { site: 'Booking.com', url: `https://www.booking.com/searchresults.html?ss=${q(to)}${dates ? `&checkin=${start}&checkout=${end}` : ''}&group_adults=${people}&no_rooms=1` },
        { site: 'Airbnb', url: `https://www.airbnb.com/s/${q(to)}/homes?adults=${people}${dates ? `&checkin=${start}&checkout=${end}` : ''}` },
        { site: 'Vrbo', url: `https://www.vrbo.com/search?destination=${q(to)}&adults=${people}${dates ? `&startDate=${start}&endDate=${end}` : ''}` },
        { site: 'Expedia', url: `https://www.expedia.com/Hotel-Search?destination=${q(to)}&adults=${people}${dates ? `&startDate=${start}&endDate=${end}` : ''}` },
        { site: 'Hotels.com', url: `https://www.hotels.com/Hotel-Search?destination=${q(to)}&adults=${people}${dates ? `&startDate=${start}&endDate=${end}` : ''}` },
        { site: 'Google Hotels', url: `https://www.google.com/travel/search?q=${q(`hotels in ${to}`)}` },
      ];
    }
    case 'flights': {
      const words = `Flights to ${to}${from ? ` from ${from}` : ''}${start ? ` on ${start}` : ''}${end ? ` through ${end}` : ''}`;
      const links: SearchLink[] = [{ site: 'Google Flights', url: `https://www.google.com/travel/flights?q=${q(words)}` }];
      if (from && start) {
        const legs = `leg1=from:${q(from)},to:${q(to)},departure:${us(start)}TANYT${end ? `&leg2=from:${q(to)},to:${q(from)},departure:${us(end)}TANYT` : ''}`;
        links.push({ site: 'Expedia', url: `https://www.expedia.com/Flights-Search?trip=${end ? 'roundtrip' : 'oneway'}&${legs}&passengers=adults:${people}` });
      }
      if (isCode(from) && isCode(to) && start) {
        links.push({ site: 'Kayak', url: `https://www.kayak.com/flights/${from}-${to}/${start}${end ? `/${end}` : ''}/${people}adults` });
        links.push({ site: 'Skyscanner', url: `https://www.skyscanner.com/transport/flights/${from!.toLowerCase()}/${to.toLowerCase()}/${start.slice(2).replace(/-/g, '')}/${end ? `${end.slice(2).replace(/-/g, '')}/` : ''}?adultsv2=${people}` });
      }
      return links;
    }
    case 'cars':
      return [
        ...(start && end ? [{ site: 'Expedia', url: `https://www.expedia.com/carsearch?locn=${q(to)}&date1=${q(us(start))}&date2=${q(us(end))}` }] : []),
        { site: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${q(`car rental ${to}`)}` },
        google(`car rental ${to}${start ? ` ${monthYear(start)}` : ''}`),
      ];
    case 'trains':
      return [
        ...(from ? [{ site: 'Rome2rio', url: `https://www.rome2rio.com/map/${q(from.replace(/\s+/g, '-'))}/${q(to.replace(/\s+/g, '-'))}` }] : []),
        ...(from ? [{ site: 'Google Maps', url: `https://www.google.com/maps/dir/?api=1&origin=${q(from)}&destination=${q(to)}&travelmode=transit` }] : []),
        google(`train ${from ? `${from} to ` : 'to '}${to}`),
      ];
    case 'cruises':
      return [
        { site: 'Expedia', url: `https://www.expedia.com/Cruise-Search?destination=${q(to)}${start ? `&earliest-departure-date=${start}` : ''}${end ? `&latest-departure-date=${end}` : ''}` },
        google(`cruises ${from ? `from ${from} ` : ''}to ${to} ${monthYear(start)}`.trim()),
        google(`${to} cruise reviews site:cruisecritic.com`),
      ];
    case 'events':
      return [
        { site: 'Ticketmaster', url: `https://www.ticketmaster.com/search?q=${q(to)}` },
        { site: 'SeatGeek', url: `https://seatgeek.com/search?search=${q(to)}` },
        google(`events in ${to} ${monthYear(start)}`.trim()),
      ];
    case 'tours':
      return [
        { site: 'GetYourGuide', url: `https://www.getyourguide.com/s/?q=${q(to)}${start ? `&date_from=${start}` : ''}${end ? `&date_to=${end}` : ''}` },
        { site: 'Viator', url: `https://www.viator.com/searchResults/all?text=${q(to)}` },
        { site: 'Airbnb Experiences', url: `https://www.airbnb.com/s/${q(to)}/experiences${start && end ? `?checkin=${start}&checkout=${end}` : ''}` },
      ];
    case 'food':
      return [
        { site: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${q(`restaurants in ${to}`)}` },
        { site: 'OpenTable', url: `https://www.opentable.com/s?term=${q(to)}&covers=${people}${start ? `&dateTime=${start}T19:00` : ''}` },
        google(`best places to eat in ${to}`),
      ];
  }
}

/** A place on a map. */
export const mapLink = (place: string, lat?: number, lon?: number) =>
  lat !== undefined && lon !== undefined ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : `https://www.google.com/maps/search/?api=1&query=${q(place)}`;

/** Directions between two places. */
export const directionsLink = (from: string, to: string) => `https://www.google.com/maps/dir/?api=1&origin=${q(from)}&destination=${q(to)}`;

/** One stay found in Poreia, on the sites where it can be booked, with the dates and party. */
export function stayLinks(name: string, city: string, start?: string, end?: string, travelers = 1): SearchLink[] {
  const dates = start && end;
  const words = `${name} ${city}`.trim();
  return [
    { site: 'Booking.com', url: `https://www.booking.com/searchresults.html?ss=${q(words)}${dates ? `&checkin=${start}&checkout=${end}` : ''}&group_adults=${travelers}&no_rooms=1` },
    { site: 'Google Hotels', url: `https://www.google.com/travel/search?q=${q(words)}${dates ? `&checkin=${start}&checkout=${end}` : ''}` },
    { site: 'Expedia', url: `https://www.expedia.com/Hotel-Search?destination=${q(words)}&adults=${travelers}${dates ? `&startDate=${start}&endDate=${end}` : ''}` },
  ];
}

/** One flight found in Poreia, searched on Google Flights by its flight numbers and date. */
export function flightLink(flights: readonly string[], from: string, to: string, date: string, back?: string): SearchLink {
  const words = `Flights from ${from} to ${to} on ${date}${back ? ` returning ${back}` : ''} ${flights.join(' ')}`;
  return { site: 'Google Flights', url: `https://www.google.com/travel/flights?q=${q(words)}` };
}

/** Directions to a point: Apple Maps on Apple devices, Google Maps elsewhere. */
export function directionsTo(name: string, lat?: number, lon?: number, apple = false): string {
  const where = lat !== undefined && lon !== undefined ? `${lat},${lon}` : name;
  return apple ? `https://maps.apple.com/?daddr=${q(where)}&q=${q(name)}` : `https://www.google.com/maps/dir/?api=1&destination=${q(where)}`;
}
