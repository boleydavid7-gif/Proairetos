import { describe, expect, it } from 'vitest';
import { handlePlaceDetails, readPlace } from '../../../worker/placeDetails';
import { placeLine } from '../../poreia/core/googlePlace';

const raw = {
  id: 'abc',
  displayName: { text: 'Time Out Market' },
  rating: 4.5,
  userRatingCount: 51234,
  priceLevel: 'PRICE_LEVEL_MODERATE',
  currentOpeningHours: { openNow: true },
  regularOpeningHours: { weekdayDescriptions: ['Monday: 10:00 AM – 12:00 AM'] },
  photos: [{ name: 'places/abc/photos/p1', authorAttributions: [{ displayName: 'Ana', uri: 'https://maps.google.com/ana' }] }],
  reviews: [{ rating: 5, text: { text: 'Great food.' }, authorAttribution: { displayName: 'Ben' }, relativePublishTimeDescription: 'a month ago' }, { rating: 4, text: { text: '' } }],
};

describe('Google details for a place', () => {
  it('keeps what Poreia shows, with authors credited', () => {
    const place = readPlace(raw);
    expect(place).toMatchObject({ id: 'abc', name: 'Time Out Market', rating: 4.5, ratings: 51234, price: 2, openNow: true, hours: ['Monday: 10:00 AM – 12:00 AM'] });
    expect(place.photoNames).toEqual([{ name: 'places/abc/photos/p1', by: 'Ana', byUrl: 'https://maps.google.com/ana' }]);
    expect(place.reviews).toEqual([{ rating: 5, text: 'Great food.', by: 'Ben', byUrl: undefined, when: 'a month ago' }]);
    expect(placeLine({ rating: 4.5, ratings: 51234, price: 2, openNow: true })).toBe('4.5 ★ · 51,234 reviews · $$ · Open now');
  });

  it('sends only the name and point, keeps the key on the server, and gives photo addresses', async () => {
    const asked: { url: string; init?: RequestInit }[] = [];
    const fake = (async (url: string, init?: RequestInit) => {
      asked.push({ url, init });
      if (url.endsWith(':searchText')) return new Response(JSON.stringify({ places: [raw] }));
      return new Response(JSON.stringify({ photoUri: 'https://lh3.googleusercontent.com/p1' }));
    }) as typeof fetch;
    const answer = await handlePlaceDetails(new Request('https://proairetos.com/api/travel/place?q=Time%20Out%20Market&lat=38.707&lon=-9.146'), 'secret', fake);
    const body = (await answer.json()) as { place: { photos: { url: string }[] } };
    expect(body.place.photos[0].url).toBe('https://lh3.googleusercontent.com/p1');
    expect(JSON.parse(String(asked[0].init?.body))).toMatchObject({ textQuery: 'Time Out Market', maxResultCount: 1 });
    expect(asked[1].url).toBe('https://places.googleapis.com/v1/places/abc/photos/p1/media?maxWidthPx=900&skipHttpRedirect=true');
    expect(JSON.stringify(body)).not.toContain('secret');
    expect((await handlePlaceDetails(new Request('https://proairetos.com/api/travel/place?q=x&lat=1&lon=2'), undefined)).status).toBe(503);
    expect((await handlePlaceDetails(new Request('https://proairetos.com/api/travel/place?q=x&lat=1&lon=2', { headers: { origin: 'https://evil.example' } }), 'k')).status).toBe(403);
  });
});
