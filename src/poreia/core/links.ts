/*
 * Searches on the sites people book with, filled in from the trip: place, dates, how many travel. Poreia never books
 * for the person; it opens the site's own search, and the booking comes back in from the confirmation.
 */

export type SearchKind = 'flights' | 'stays' | 'cars' | 'trains' | 'ferries' | 'cruises' | 'events' | 'tours' | 'food';

export const SEARCH_KINDS: { id: SearchKind; label: string }[] = [
  { id: 'stays', label: 'Stays' },
  { id: 'flights', label: 'Flights' },
  { id: 'cars', label: 'Cars' },
  { id: 'trains', label: 'Trains and buses' },
  { id: 'ferries', label: 'Ferries' },
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
  /** Airport codes for both ends, when known (typed, or the nearest from the map): sites that need codes join in. */
  fromCode?: string;
  toCode?: string;
  /** The destination's ISO country code, for sites that only cover some countries. */
  country?: string;
};

/** A search on a site. `front` marks a site that cannot be opened at a search, only at its front page. */
export type SearchLink = { site: string; url: string; front?: true };

const q = encodeURIComponent;
const front = (site: string, url: string): SearchLink => ({ site, url, front: true });
const NORTH_AMERICA = ['US', 'CA'];
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

/** What each site is for, in a few words, shown under its name. */
export const SITE_ABOUT: Record<string, string> = {
  'Booking.com': 'Hotels, apartments and guesthouses; many with free cancellation',
  Airbnb: 'Homes and rooms from hosts',
  Vrbo: 'Whole homes, often for families and groups',
  Expedia: 'Hotels, flights, cars and cruises; bundles',
  'Hotels.com': 'Hotels, with its own rewards nights',
  'Google Hotels': 'Prices from many sites side by side, with a map',
  Hostelworld: 'Hostels and shared rooms',
  Agoda: 'Hotels, strong across Asia',
  'Google Flights': 'Every airline’s fares on one calendar; price tracking',
  Kayak: 'Compares airlines and travel sites',
  Skyscanner: 'Compares airlines and budget carriers; whole-month view',
  Momondo: 'Compares many smaller agents too',
  Turo: 'Cars from local owners',
  'Rentalcars.com': 'Rental companies compared',
  'Discover Cars': 'Rental companies compared, with full cover options',
  'Google Maps': 'Places on the map, with reviews and directions',
  Rome2rio: 'Every way between two places: train, bus, ferry, flight, drive',
  Amtrak: 'Trains in the US and to Canada',
  Wanderu: 'Buses and trains in North America compared',
  Greyhound: 'Buses across the US, Canada and Mexico',
  FlixBus: 'Low-cost buses and some trains',
  Trainline: 'Trains and coaches across Europe and the UK',
  Omio: 'Trains, buses and flights in Europe compared',
  '12Go': 'Trains, buses and ferries across Asia',
  'Direct Ferries': 'Ferry routes worldwide compared',
  Ferryhopper: 'Ferries in Greece, Italy, Spain and around',
  'Cruise Critic': 'Ship and itinerary reviews',
  CruiseDirect: 'Cruise deals across lines',
  Ticketmaster: 'Concerts, sports and theater',
  SeatGeek: 'Event tickets with resale',
  Eventbrite: 'Local events, classes and gatherings',
  StubHub: 'Resale tickets',
  GetYourGuide: 'Tours, tickets and day trips',
  Viator: 'Tours and activities from Tripadvisor',
  'Airbnb Experiences': 'Activities led by locals',
  Klook: 'Activities and passes, strong across Asia',
  Tripadvisor: 'Reviews of places to see, stay and eat',
  OpenTable: 'Restaurant reservations',
  Resy: 'Restaurant reservations, mostly US cities',
  TheFork: 'Restaurant reservations across Europe',
  Yelp: 'Restaurant reviews and photos',
  Google: 'A web search with the details filled in',
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
        front('Hostelworld', 'https://www.hostelworld.com/'),
        front('Agoda', 'https://www.agoda.com/'),
      ];
    }
    case 'flights': {
      const fromCode = isCode(input.fromCode) ? input.fromCode! : isCode(from) ? from! : undefined;
      const toCode = isCode(input.toCode) ? input.toCode! : isCode(to) ? to : undefined;
      const words = `Flights to ${toCode ?? to}${from ? ` from ${fromCode ?? from}` : ''}${start ? ` on ${start}` : ''}${end ? ` through ${end}` : ''}`;
      const links: SearchLink[] = [{ site: 'Google Flights', url: `https://www.google.com/travel/flights?q=${q(words)}` }];
      if (fromCode && toCode && start) {
        const route = `${fromCode}-${toCode}/${start}${end ? `/${end}` : ''}/${people}adults`;
        links.push({ site: 'Kayak', url: `https://www.kayak.com/flights/${route}` });
        links.push({ site: 'Skyscanner', url: `https://www.skyscanner.com/transport/flights/${fromCode.toLowerCase()}/${toCode.toLowerCase()}/${start.slice(2).replace(/-/g, '')}/${end ? `${end.slice(2).replace(/-/g, '')}/` : ''}?adultsv2=${people}` });
        links.push({ site: 'Momondo', url: `https://www.momondo.com/flight-search/${route}` });
      }
      if (from && start) {
        const a = fromCode ?? from;
        const b = toCode ?? to;
        const legs = `leg1=from:${q(a)},to:${q(b)},departure:${us(start)}TANYT${end ? `&leg2=from:${q(b)},to:${q(a)},departure:${us(end)}TANYT` : ''}`;
        links.push({ site: 'Expedia', url: `https://www.expedia.com/Flights-Search?trip=${end ? 'roundtrip' : 'oneway'}&${legs}&passengers=adults:${people}` });
      }
      if (!(fromCode && toCode && start)) links.push(front('Kayak', 'https://www.kayak.com/flights'), front('Skyscanner', 'https://www.skyscanner.com/'));
      return links;
    }
    case 'cars': {
      const code = isCode(input.toCode) ? input.toCode : undefined;
      const dates = start && end;
      return [
        // Kayak's car search takes an airport code; without one its front page.
        dates && code ? { site: 'Kayak', url: `https://www.kayak.com/cars/${code}/${start}/${end}` } : front('Kayak', 'https://www.kayak.com/cars'),
        ...(dates ? [{ site: 'Expedia', url: `https://www.expedia.com/carsearch?locn=${q(input.toCode ?? to)}&date1=${q(us(start))}&date2=${q(us(end))}` }] : []),
        front('Turo', 'https://turo.com/'),
        front('Rentalcars.com', 'https://www.rentalcars.com/'),
        front('Discover Cars', 'https://www.discovercars.com/'),
        { site: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${q(`car rental ${to}`)}` },
      ];
    }
    case 'trains': {
      const local = input.country && NORTH_AMERICA.includes(input.country.toUpperCase());
      return [
        ...(from ? [{ site: 'Rome2rio', url: `https://www.rome2rio.com/map/${q(from.replace(/\s+/g, '-'))}/${q(to.replace(/\s+/g, '-'))}` }] : []),
        ...(from ? [{ site: 'Google Maps', url: `https://www.google.com/maps/dir/?api=1&origin=${q(from)}&destination=${q(to)}&travelmode=transit` }] : []),
        ...(local
          ? [front('Amtrak', 'https://www.amtrak.com/'), front('Wanderu', 'https://www.wanderu.com/'), front('Greyhound', 'https://www.greyhound.com/'), front('FlixBus', 'https://www.flixbus.com/')]
          : [front('Trainline', 'https://www.thetrainline.com/'), front('Omio', 'https://www.omio.com/'), front('FlixBus', 'https://www.flixbus.com/'), front('12Go', 'https://12go.asia/')]),
        google(`train ${from ? `${from} to ` : 'to '}${to}`),
      ];
    }
    case 'ferries':
      return [
        ...(from ? [{ site: 'Rome2rio', url: `https://www.rome2rio.com/map/${q(from.replace(/\s+/g, '-'))}/${q(to.replace(/\s+/g, '-'))}` }] : []),
        front('Direct Ferries', 'https://www.directferries.com/'),
        front('Ferryhopper', 'https://www.ferryhopper.com/'),
        google(`ferry ${from ? `${from} to ` : 'to '}${to}`),
      ];
    case 'cruises':
      return [
        { site: 'Expedia', url: `https://www.expedia.com/Cruise-Search?destination=${q(to)}${start ? `&earliest-departure-date=${start}` : ''}${end ? `&latest-departure-date=${end}` : ''}` },
        front('Cruise Critic', 'https://www.cruisecritic.com/'),
        front('CruiseDirect', 'https://www.cruisedirect.com/'),
        google(`cruises ${from ? `from ${from} ` : ''}to ${to} ${monthYear(start)}`.trim()),
      ];
    case 'events':
      return [
        { site: 'Ticketmaster', url: `https://www.ticketmaster.com/search?q=${q(to)}` },
        { site: 'SeatGeek', url: `https://seatgeek.com/search?search=${q(to)}` },
        front('Eventbrite', 'https://www.eventbrite.com/'),
        front('StubHub', 'https://www.stubhub.com/'),
        google(`events in ${to} ${monthYear(start)}`.trim()),
      ];
    case 'tours':
      return [
        { site: 'GetYourGuide', url: `https://www.getyourguide.com/s/?q=${q(to)}${start ? `&date_from=${start}` : ''}${end ? `&date_to=${end}` : ''}` },
        { site: 'Viator', url: `https://www.viator.com/searchResults/all?text=${q(to)}` },
        front('Klook', 'https://www.klook.com/'),
        { site: 'Tripadvisor', url: `https://www.tripadvisor.com/Search?q=${q(to)}` },
        { site: 'Airbnb Experiences', url: `https://www.airbnb.com/s/${q(to)}/experiences${start && end ? `?checkin=${start}&checkout=${end}` : ''}` },
      ];
    case 'food':
      return [
        { site: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${q(`restaurants in ${to}`)}` },
        { site: 'OpenTable', url: `https://www.opentable.com/s?term=${q(to)}&covers=${people}${start ? `&dateTime=${start}T19:00` : ''}` },
        front('Resy', 'https://resy.com/'),
        front('TheFork', 'https://www.thefork.com/'),
        { site: 'Yelp', url: `https://www.yelp.com/search?find_desc=Restaurants&find_loc=${q(to)}` },
        google(`best places to eat in ${to}`),
      ];
  }
}

/** A place on a map. */
export const mapLink = (place: string, lat?: number, lon?: number) =>
  lat !== undefined && lon !== undefined ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : `https://www.google.com/maps/search/?api=1&query=${q(place)}`;

/** Directions between two places. */
export const directionsLink = (from: string, to: string) => `https://www.google.com/maps/dir/?api=1&origin=${q(from)}&destination=${q(to)}`;

/** A multi-stop driving route, opened in Google Maps with Poreia's stop order preserved. */
export function routeLink(points: readonly { name: string; lat?: number; lon?: number }[]): string {
  const where = (point: { name: string; lat?: number; lon?: number }) => (point.lat !== undefined && point.lon !== undefined ? `${point.lat},${point.lon}` : point.name);
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 'https://www.google.com/maps';
  const middle = points.slice(1, -1).map(where).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${q(where(first))}&destination=${q(where(last))}${middle ? `&waypoints=${q(middle)}` : ''}&travelmode=driving`;
}

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
