import { describe, expect, it } from 'vitest';
import { distanceText, metersBetween, overpassQuery, plainWiki, readListings, readOverpass } from '../../poreia/core/spots';

describe('places from OpenStreetMap', () => {
  it('asks for named places of a kind around a point', () => {
    const query = overpassQuery('coffee', 38.7139, -9.1394, 1500, 30);
    expect(query).toContain('(around:1500,38.71390,-9.13940)');
    expect(query).toContain('["amenity"~"^(cafe|ice_cream)$"]["name"]');
    expect(query).toContain('out center tags 30');
  });

  it('reads nodes and ways, nearest first, leaving out unnamed and repeated places', () => {
    const spots = readOverpass(
      {
        elements: [
          { type: 'way', id: 2, center: { lat: 38.72, lon: -9.14 }, tags: { name: 'Café A Brasileira', amenity: 'cafe', 'addr:street': 'Rua Garrett', 'addr:housenumber': '120', opening_hours: 'Mo-Su 08:00-02:00', website: 'https://abrasileira.pt', outdoor_seating: 'yes' } },
          { type: 'node', id: 1, lat: 38.7139, lon: -9.1394, tags: { name: 'Pastéis', shop: 'bakery', 'name:en': 'Pastries' } },
          { type: 'node', id: 3, lat: 38.7139, lon: -9.1394, tags: { amenity: 'cafe' } },
          { type: 'node', id: 4, lat: 38.72, lon: -9.14, tags: { name: 'Café A Brasileira', amenity: 'cafe' } },
        ],
      },
      'coffee',
      { lat: 38.7139, lon: -9.1394 },
    );
    expect(spots.map((spot) => spot.name)).toEqual(['Pastries (Pastéis)', 'Café A Brasileira']);
    const cafe = spots[1];
    expect(cafe).toMatchObject({ kind: 'Café', address: '120 Rua Garrett', hours: 'Mo-Su 08:00-02:00', url: 'https://abrasileira.pt', source: 'map', category: 'coffee' });
    expect(cafe.details).toContain('Outdoor seating');
    expect(spots[0].kind).toBe('Bakery');
  });

  it('measures straight-line distance', () => {
    const meters = metersBetween({ lat: 38.7139, lon: -9.1394 }, { lat: 38.7223, lon: -9.1393 });
    expect(meters).toBeGreaterThan(900);
    expect(meters).toBeLessThan(960);
    expect(distanceText(320)).toBe('300 m');
    expect(distanceText(2500)).toBe('2.5 km');
    expect(distanceText(1609.344, 'F')).toBe('1.0 mi');
  });
});

describe('listings from Wikivoyage', () => {
  const page = `==See==
* {{see
| name=[[Belém Tower]] | alt=Torre de Belém | url=https://www.torrebelem.gov.pt | email=
| address=Av. Brasília | lat=38.6916 | long=-9.2160 | directions=tram 15
| phone=+351 21 362 0034 | hours=Tu-Su 10:00-18:30 | price=€8
| content=A 16th-century fortified tower, '''UNESCO''' listed.<ref>source</ref>
}}
==Eat==
* {{eat | name=Time Out Market | address=Av. 24 de Julho 49 | lat=38.7069 | long=-9.1459 | price=Mains €10-20 | content=Many stalls under one roof, see [[Cais do Sodré|the riverside]].}}
==Sleep==
* {{listing | type=sleep | name=Lisbon Hostel | checkin=14:00 | checkout=11:00 | price={{EUR|25}} a night | content=Dorms.}}
* {{do | name= | content=No name, left out.}}
* {{marker | name=Not a listing}}`;

  it('reads each listing with its fields in plain words', () => {
    const spots = readListings(page, 'Lisbon');
    expect(spots.map((spot) => [spot.name, spot.category, spot.kind])).toEqual([
      ['Belém Tower', 'see', 'See'],
      ['Time Out Market', 'eat', 'Eat'],
      ['Lisbon Hostel', 'sleep', 'Sleep'],
    ]);
    expect(spots[0]).toMatchObject({ lat: 38.6916, lon: -9.216, hours: 'Tu-Su 10:00-18:30', price: '€8', url: 'https://www.torrebelem.gov.pt', source: 'guide' });
    expect(spots[0].about).toBe('A 16th-century fortified tower, UNESCO listed.');
    expect(spots[0].details).toEqual(['Torre de Belém', 'tram 15']);
    expect(spots[1].about).toBe('Many stalls under one roof, see the riverside.');
    expect(spots[2].details).toEqual(['Check-in 14:00', 'Check-out 11:00']);
    expect(spots[2].price).toBe('€25 a night');
  });

  it('turns wiki markup into plain words', () => {
    expect(plainWiki("[[Alfama|Old town]] and '''bold''' [https://x.org a link]<!-- note -->")).toBe('Old town and bold a link');
    expect(plainWiki('{{USD|12-18}} or {{CHF|30}}')).toBe('$12-18 or 30 CHF');
  });
});
