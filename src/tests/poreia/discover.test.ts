import { describe, expect, it } from 'vitest';
import { normalizedPlaceKey, searchCuratedPlaces } from '../../poreia/core/discover';

describe('Poreia Discover guide', () => {
  it('searches curated places across names, locations, categories, and collections', () => {
    expect(searchCuratedPlaces('maine').map((place) => place.id)).toContain('acadia');
    expect(searchCuratedPlaces('national parks')).toHaveLength(4);
  });

  it('can narrow a search to one collection', () => {
    expect(searchCuratedPlaces('', 'Weekend escapes').map((place) => place.id)).toEqual(['hudson-valley', 'asheville', 'sedona']);
  });

  it('uses provider identifiers when deduplicating saved results', () => {
    expect(normalizedPlaceKey('Acadia National Park', 'Maine', 'acadia')).toBe('provider:acadia');
    expect(normalizedPlaceKey('Acadia National Park', 'Maine')).toBe('acadia national park maine');
  });
});
