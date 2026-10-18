import type { PlaceIdea } from './trips';

export type CuratedPlace = {
  id: string;
  name: string;
  location: string;
  category: string;
  collection: string;
  season: string;
  description: string;
  url: string;
};

/** A small, clearly labeled starter guide used when no places provider is configured. */
export const CURATED_PLACES: readonly CuratedPlace[] = [
  { id: 'acadia', name: 'Acadia National Park', location: 'Maine', category: 'Outdoors', collection: 'National parks and outdoor adventures', season: 'Late spring through fall', description: 'Granite coast, carriage roads, and sunrise from Cadillac Mountain.', url: 'https://www.nps.gov/acad/' },
  { id: 'smokies', name: 'Great Smoky Mountains', location: 'Tennessee and North Carolina', category: 'Outdoors', collection: 'National parks and outdoor adventures', season: 'Spring through fall', description: 'Mountain trails, waterfalls, and one of the country’s most diverse forests.', url: 'https://www.nps.gov/grsm/' },
  { id: 'olympic', name: 'Olympic National Park', location: 'Washington', category: 'Outdoors', collection: 'National parks and outdoor adventures', season: 'Summer through early fall', description: 'Rainforest, alpine country, and a long Pacific shoreline in one trip.', url: 'https://www.nps.gov/olym/' },
  { id: 'joshua-tree', name: 'Joshua Tree National Park', location: 'California', category: 'Outdoors', collection: 'National parks and outdoor adventures', season: 'Fall through spring', description: 'Desert light, boulders, and clear night skies close to Southern California cities.', url: 'https://www.nps.gov/jotr/' },
  { id: 'monterey', name: 'Monterey and Big Sur', location: 'California', category: 'Coast', collection: 'Beaches and coastal towns', season: 'Year-round', description: 'Coastal drives, tide pools, and small towns along Highway 1.', url: 'https://www.seemonterey.com/' },
  { id: 'san-juan', name: 'San Juan Islands', location: 'Washington', category: 'Coast', collection: 'Beaches and coastal towns', season: 'Summer', description: 'Ferries, quiet coves, and whale watching between evergreen islands.', url: 'https://www.visitsanjuans.com/' },
  { id: 'san-diego', name: 'San Diego', location: 'California', category: 'Coast', collection: 'Beaches and coastal towns', season: 'Year-round', description: 'Neighborhood beaches, museums, and an easygoing coastal pace.', url: 'https://www.sandiego.org/' },
  { id: 'charleston', name: 'Charleston', location: 'South Carolina', category: 'Culture', collection: 'Historic cities and cultural experiences', season: 'Spring and fall', description: 'Historic streets, galleries, gardens, and Lowcountry food.', url: 'https://www.charlestoncvb.com/' },
  { id: 'santa-fe', name: 'Santa Fe', location: 'New Mexico', category: 'Culture', collection: 'Historic cities and cultural experiences', season: 'Spring and fall', description: 'Adobe architecture, art markets, and high-desert evenings.', url: 'https://www.santafe.org/' },
  { id: 'savannah', name: 'Savannah', location: 'Georgia', category: 'Culture', collection: 'Historic cities and cultural experiences', season: 'Spring and fall', description: 'Shaded squares, riverfront walks, and a slower historic-city weekend.', url: 'https://visitsavannah.com/' },
  { id: 'new-orleans', name: 'New Orleans', location: 'Louisiana', category: 'Food', collection: 'Food and restaurant destinations', season: 'Fall through spring', description: 'Distinct neighborhoods, live music, and food with deep local roots.', url: 'https://www.neworleans.com/' },
  { id: 'portland-maine', name: 'Portland', location: 'Maine', category: 'Food', collection: 'Food and restaurant destinations', season: 'Summer through fall', description: 'A compact waterfront city with a strong restaurant and brewery scene.', url: 'https://www.visitportland.com/' },
  { id: 'chicago', name: 'Chicago', location: 'Illinois', category: 'Culture', collection: 'Food and restaurant destinations', season: 'Summer through fall', description: 'Architecture, lakefront paths, neighborhood restaurants, and museums.', url: 'https://www.choosechicago.com/' },
  { id: 'hudson-valley', name: 'Hudson Valley', location: 'New York', category: 'Road trip', collection: 'Weekend escapes', season: 'Spring through fall', description: 'River towns, farm stands, galleries, and easy drives from New York City.', url: 'https://www.visithudsonvalley.com/' },
  { id: 'asheville', name: 'Asheville', location: 'North Carolina', category: 'Food', collection: 'Weekend escapes', season: 'Spring through fall', description: 'Mountain views, independent food and drink, and nearby trailheads.', url: 'https://www.exploreasheville.com/' },
  { id: 'sedona', name: 'Sedona', location: 'Arizona', category: 'Outdoors', collection: 'Weekend escapes', season: 'Fall through spring', description: 'Red-rock trails, high-desert scenery, and a walkable arts village.', url: 'https://visitsedona.com/' },
];

export const COLLECTIONS = [...new Set(CURATED_PLACES.map((place) => place.collection))];

export function normalizedPlaceKey(name: string, location?: string, providerId?: string): string {
  if (providerId) return `provider:${providerId.trim().toLowerCase()}`;
  return `${name} ${location ?? ''}`.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

export function searchCuratedPlaces(query: string, collection?: string): CuratedPlace[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return CURATED_PLACES.filter((place) => {
    if (collection && place.collection !== collection) return false;
    const haystack = `${place.name} ${place.location} ${place.category} ${place.collection} ${place.season}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export function placeFromIdea(place: PlaceIdea): CuratedPlace {
  return {
    id: place.providerId ?? place.id,
    name: place.name,
    location: place.location ?? place.address ?? 'Location to decide',
    category: place.category ?? 'Saved place',
    collection: place.collection ?? 'Saved places',
    season: 'Add your own dates',
    description: place.note ?? 'A place you saved for later research.',
    url: place.externalUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.location ?? ''}`)}`,
  };
}
