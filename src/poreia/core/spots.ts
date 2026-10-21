/*
 * Places around a trip, read in the app: OpenStreetMap's map data (through the Overpass API) for what is nearby, and
 * Wikivoyage's own listings (See, Do, Buy, Eat, Drink, Sleep) for what the guide's writers chose. Both are turned into
 * one shape, a Spot, which the map, the lists and a place's page all read. Saved spots belong to a trip.
 */

export type SpotSource = 'map' | 'guide' | 'event' | 'stay';

export type Spot = {
  id: string;
  /** The trip it was saved to; absent while it is only being looked at. */
  tripId?: string;
  name: string;
  /** A plain word for what it is: Café, Museum, Hotel, See, Eat. */
  kind: string;
  /** The category it was found under, for its pin and its chips. */
  category: SpotCategory;
  source: SpotSource;
  lat?: number;
  lon?: number;
  address?: string;
  hours?: string;
  price?: string;
  phone?: string;
  url?: string;
  /** A sentence or two about it, from the guide or the provider. */
  about?: string;
  /** Other details worth a line: cuisine, wheelchair access, check-in. */
  details?: string[];
  image?: string;
  /** Kept when saved: the id it was found under, so a list knows it is saved. */
  ref?: string;
  note?: string;
  createdAt?: string;
};

export type SpotCategory = 'see' | 'do' | 'eat' | 'coffee' | 'drink' | 'sleep' | 'shop' | 'outdoors' | 'around' | 'essentials' | 'event';

export const SPOT_CATEGORIES: { id: SpotCategory; label: string }[] = [
  { id: 'see', label: 'Sights' },
  { id: 'do', label: 'Things to do' },
  { id: 'eat', label: 'Food' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'drink', label: 'Drinks' },
  { id: 'outdoors', label: 'Outdoors' },
  { id: 'sleep', label: 'Stays' },
  { id: 'shop', label: 'Shops' },
  { id: 'around', label: 'Getting around' },
  { id: 'essentials', label: 'Essentials' },
];

export const categoryLabel = (id: SpotCategory) => (id === 'event' ? 'Events' : SPOT_CATEGORIES.find((each) => each.id === id)?.label ?? 'Places');

// ---------- OpenStreetMap ----------

/** The OpenStreetMap tags each category asks for. */
const FILTERS: Record<Exclude<SpotCategory, 'event'>, string[]> = {
  see: ['["tourism"~"^(attraction|viewpoint|artwork)$"]', '["historic"~"^(monument|castle|memorial|ruins|archaeological_site|fort|church)$"]', '["amenity"="place_of_worship"]["tourism"]'],
  do: ['["tourism"~"^(museum|gallery|zoo|aquarium|theme_park)$"]', '["amenity"~"^(theatre|cinema|arts_centre)$"]', '["leisure"~"^(water_park|amusement_arcade|sports_centre)$"]'],
  eat: ['["amenity"~"^(restaurant|fast_food|food_court)$"]'],
  coffee: ['["amenity"~"^(cafe|ice_cream)$"]', '["shop"~"^(bakery|pastry)$"]'],
  drink: ['["amenity"~"^(bar|pub|biergarten|nightclub)$"]'],
  outdoors: ['["leisure"~"^(park|garden|nature_reserve)$"]["name"]', '["natural"~"^(beach|peak)$"]["name"]'],
  sleep: ['["tourism"~"^(hotel|guest_house|hostel|apartment|motel|camp_site|chalet)$"]'],
  shop: ['["shop"~"^(supermarket|convenience|mall|department_store|marketplace|books|gift)$"]', '["amenity"="marketplace"]'],
  around: ['["amenity"~"^(car_rental|bicycle_rental|bus_station|ferry_terminal|taxi|fuel|charging_station|parking)$"]', '["railway"="station"]', '["public_transport"="station"]'],
  essentials: ['["amenity"~"^(pharmacy|hospital|clinic|atm|bank|toilets|police|post_office)$"]', '["shop"="chemist"]'],
};

/** An Overpass query for one category within `radius` meters, named things only. */
export function overpassQuery(category: Exclude<SpotCategory, 'event'>, lat: number, lon: number, radius = 2000, limit = 80): string {
  const around = `(around:${Math.round(radius)},${lat.toFixed(5)},${lon.toFixed(5)})`;
  const parts = FILTERS[category].map((filter) => `nwr${around}${filter}["name"];`).join('');
  return `[out:json][timeout:20];(${parts});out center tags ${limit};`;
}

type OsmElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

const WORDS: Record<string, string> = {
  attraction: 'Sight', viewpoint: 'Viewpoint', artwork: 'Artwork', monument: 'Monument', castle: 'Castle', memorial: 'Memorial',
  ruins: 'Ruins', archaeological_site: 'Archaeological site', fort: 'Fort', church: 'Church', place_of_worship: 'Place of worship',
  museum: 'Museum', gallery: 'Gallery', zoo: 'Zoo', aquarium: 'Aquarium', theme_park: 'Theme park', theatre: 'Theater', cinema: 'Cinema',
  arts_centre: 'Arts center', water_park: 'Water park', amusement_arcade: 'Arcade', sports_centre: 'Sports center',
  restaurant: 'Restaurant', fast_food: 'Quick food', food_court: 'Food court', cafe: 'Café', ice_cream: 'Ice cream', bakery: 'Bakery',
  pastry: 'Pastry shop', bar: 'Bar', pub: 'Pub', biergarten: 'Beer garden', nightclub: 'Nightclub', park: 'Park', garden: 'Garden',
  nature_reserve: 'Nature reserve', beach: 'Beach', peak: 'Peak', hotel: 'Hotel', guest_house: 'Guest house', hostel: 'Hostel',
  apartment: 'Apartment', motel: 'Motel', camp_site: 'Campsite', chalet: 'Chalet', supermarket: 'Supermarket', convenience: 'Convenience store',
  mall: 'Mall', department_store: 'Department store', marketplace: 'Market', books: 'Bookshop', gift: 'Gift shop', car_rental: 'Car rental',
  bicycle_rental: 'Bike rental', bus_station: 'Bus station', ferry_terminal: 'Ferry terminal', taxi: 'Taxi stand', fuel: 'Fuel',
  charging_station: 'Charging', parking: 'Parking', station: 'Station', pharmacy: 'Pharmacy', chemist: 'Pharmacy', hospital: 'Hospital',
  clinic: 'Clinic', atm: 'ATM', bank: 'Bank', toilets: 'Restrooms', police: 'Police', post_office: 'Post office',
};

function kindOf(tags: Record<string, string>): string {
  for (const key of ['tourism', 'historic', 'amenity', 'leisure', 'natural', 'shop', 'railway', 'public_transport']) {
    const value = tags[key];
    if (value && WORDS[value]) return WORDS[value];
  }
  return 'Place';
}

const title = (text: string) => text.replace(/_/g, ' ').replace(/;/g, ', ').replace(/^\w/, (letter) => letter.toUpperCase());

/** Overpass's answer as spots, nearest first when a center is given; unnamed and duplicate places left out. */
export function readOverpass(data: { elements?: OsmElement[] }, category: SpotCategory, center?: { lat: number; lon: number }): Spot[] {
  const seen = new Set<string>();
  const spots: Spot[] = [];
  for (const element of data.elements ?? []) {
    const tags = element.tags ?? {};
    const name = tags.name ?? tags['name:en'];
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!name || lat === undefined || lon === undefined) continue;
    const key = `${name.toLowerCase()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
    const address = [street, tags['addr:city']].filter(Boolean).join(', ') || undefined;
    const details = [
      tags.cuisine && title(tags.cuisine),
      tags.stars && `${tags.stars} stars`,
      tags.wheelchair === 'yes' ? 'Step-free access' : tags.wheelchair === 'limited' ? 'Some step-free access' : undefined,
      tags.outdoor_seating === 'yes' ? 'Outdoor seating' : undefined,
      tags.internet_access === 'wlan' || tags.internet_access === 'yes' ? 'Wi-Fi' : undefined,
      tags.fee === 'no' ? 'Free entry' : undefined,
    ].filter((each): each is string => Boolean(each));
    spots.push({
      id: `osm-${element.type}-${element.id}`,
      name: tags['name:en'] && tags['name:en'] !== name ? `${tags['name:en']} (${name})` : name,
      kind: kindOf(tags),
      category,
      source: 'map',
      lat,
      lon,
      address,
      hours: tags.opening_hours,
      phone: tags.phone ?? tags['contact:phone'],
      url: tags.website ?? tags['contact:website'] ?? tags.url,
      about: tags.description,
      details: details.length ? details : undefined,
    });
  }
  if (center) spots.sort((a, b) => metersBetween(center, a) - metersBetween(center, b));
  return spots;
}

// ---------- Wikivoyage ----------

const LISTING_TYPES: Record<string, SpotCategory> = { see: 'see', do: 'do', buy: 'shop', eat: 'eat', drink: 'drink', sleep: 'sleep', go: 'around' };
const LISTING_WORD: Record<string, string> = { see: 'See', do: 'Do', buy: 'Buy', eat: 'Eat', drink: 'Drink', sleep: 'Sleep', go: 'Getting there' };

/** Wiki markup to plain words: links keep their shown text, bold, italics, references and templates go. */
const MONEY_MARK: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', JPY: '¥', INR: '₹' };

export function plainWiki(text: string): string {
  return text
    // Prices are written as {{EUR|25}}: keep the amount.
    .replace(/\{\{\s*([A-Z]{3})\s*\|\s*([\d.,\s–-]+)\}\}/g, (_, code: string, amount: string) => (MONEY_MARK[code] ? `${MONEY_MARK[code]}${amount.trim()}` : `${amount.trim()} ${code}`))
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/\S+\]/g, '')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The `{{...}}` blocks of a page that start with one of the names, whole even when they hold other templates. */
function templates(text: string, names: RegExp): string[] {
  const found: string[] = [];
  let index = 0;
  while ((index = text.indexOf('{{', index)) !== -1) {
    const head = text.slice(index + 2, index + 40);
    if (!names.test(head)) {
      index += 2;
      continue;
    }
    let depth = 0;
    let end = index;
    for (; end < text.length - 1; end++) {
      if (text[end] === '{' && text[end + 1] === '{') {
        depth++;
        end++;
      } else if (text[end] === '}' && text[end + 1] === '}') {
        depth--;
        end++;
        if (depth === 0) break;
      }
    }
    found.push(text.slice(index + 2, end - 1));
    index = end + 1;
  }
  return found;
}

/** A template's named fields, splitting on `|` only at its own level. */
function fields(body: string): { name: string; values: Record<string, string> } {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      depth++;
      i++;
    } else if (two === '}}' || two === ']]') {
      depth--;
      i++;
    } else if (body[i] === '|' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  const values: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const at = part.indexOf('=');
    if (at > 0) values[part.slice(0, at).trim().toLowerCase()] = part.slice(at + 1).trim();
  }
  return { name: parts[0].trim().toLowerCase(), values };
}

/** Wikivoyage's listings on a page: each See, Do, Buy, Eat, Drink and Sleep entry with whatever the writers gave. */
export function readListings(wikitext: string, page: string): Spot[] {
  const spots: Spot[] = [];
  for (const body of templates(wikitext, /^\s*(see|do|buy|eat|drink|sleep|go|listing)\s*[|\n}]/i)) {
    const { name: template, values } = fields(body);
    const type = template === 'listing' ? (values.type ?? '').toLowerCase() : template;
    const category = LISTING_TYPES[type];
    const name = plainWiki(values.name ?? '');
    if (!category || !name) continue;
    const lat = Number.parseFloat(values.lat ?? '');
    const lon = Number.parseFloat(values.long ?? values.lon ?? '');
    const url = (values.url ?? '').trim();
    const details = [
      values.alt && plainWiki(values.alt),
      values.directions && plainWiki(values.directions),
      values.checkin && `Check-in ${plainWiki(values.checkin)}`,
      values.checkout && `Check-out ${plainWiki(values.checkout)}`,
    ].filter((each): each is string => Boolean(each));
    spots.push({
      id: `guide-${page}-${spots.length}-${name.toLowerCase().replace(/\W+/g, '-').slice(0, 40)}`,
      name,
      kind: LISTING_WORD[type],
      category,
      source: 'guide',
      lat: Number.isFinite(lat) ? lat : undefined,
      lon: Number.isFinite(lon) ? lon : undefined,
      address: plainWiki(values.address ?? '') || undefined,
      hours: plainWiki(values.hours ?? '') || undefined,
      price: plainWiki(values.price ?? '') || undefined,
      phone: plainWiki(values.phone ?? '') || undefined,
      url: /^https?:\/\//.test(url) ? url : undefined,
      about: plainWiki(values.content ?? values.description ?? '') || undefined,
      details: details.length ? details : undefined,
    });
  }
  return spots;
}

// ---------- Distance ----------

/** Straight-line meters between two points (haversine). */
export function metersBetween(a: { lat?: number; lon?: number }, b: { lat?: number; lon?: number }): number {
  if (a.lat === undefined || a.lon === undefined || b.lat === undefined || b.lon === undefined) return Number.POSITIVE_INFINITY;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export const distanceText = (meters: number, unit: 'C' | 'F' = 'C') => {
  if (!Number.isFinite(meters)) return '';
  if (unit === 'F') {
    const miles = meters / 1609.344;
    return miles < 0.2 ? `${Math.round(meters * 3.281 / 50) * 50} ft` : `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
  }
  return meters < 950 ? `${Math.round(meters / 50) * 50} m` : `${(meters / 1000).toFixed(1)} km`;
};
