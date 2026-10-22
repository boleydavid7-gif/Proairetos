import { tooOften } from './safeFetch';

/*
 * Poreia's Google details for one place: rating, review count, price level, opening hours, a few reviews and photos,
 * through Google's Places API (New) with the secret GOOGLE_PLACES_KEY. Only the place's name and rough point are sent.
 * Photos come back as Google's own short-lived image addresses (the key never reaches the page). Google's terms keep
 * this content for no more than 30 days; the edge keeps it a day and the device a week.
 */

export type GooglePlace = {
  id: string;
  name: string;
  rating?: number;
  ratings?: number;
  /** 1 to 4, as $ to $$$$. */
  price?: number;
  openNow?: boolean;
  hours?: string[];
  summary?: string;
  phone?: string;
  site?: string;
  mapsUrl?: string;
  wheelchair?: boolean;
  photos: { url: string; by?: string; byUrl?: string }[];
  reviews: { rating?: number; text: string; by?: string; byUrl?: string; when?: string }[];
};

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  editorialSummary?: { text?: string };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  accessibilityOptions?: { wheelchairAccessibleEntrance?: boolean };
  photos?: { name?: string; authorAttributions?: { displayName?: string; uri?: string }[] }[];
  reviews?: { rating?: number; text?: { text?: string }; originalText?: { text?: string }; authorAttribution?: { displayName?: string; uri?: string }; relativePublishTimeDescription?: string }[];
};

const FIELDS = [
  'places.id',
  'places.displayName',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.currentOpeningHours.openNow',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.editorialSummary',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.accessibilityOptions',
  'places.photos',
  'places.reviews',
].join(',');

const PRICE: Record<string, number> = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };

function reply(status: number, body: unknown, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store', 'x-robots-tag': 'noindex' },
  });
}

/** Google's place reduced to what Poreia shows, photo addresses filled in after. */
export function readPlace(raw: RawPlace): Omit<GooglePlace, 'photos'> & { photoNames: { name: string; by?: string; byUrl?: string }[] } {
  return {
    id: raw.id ?? '',
    name: raw.displayName?.text ?? '',
    rating: raw.rating,
    ratings: raw.userRatingCount,
    price: raw.priceLevel ? PRICE[raw.priceLevel] : undefined,
    openNow: raw.currentOpeningHours?.openNow,
    hours: raw.regularOpeningHours?.weekdayDescriptions,
    summary: raw.editorialSummary?.text,
    phone: raw.nationalPhoneNumber,
    site: raw.websiteUri,
    mapsUrl: raw.googleMapsUri,
    wheelchair: raw.accessibilityOptions?.wheelchairAccessibleEntrance,
    photoNames: (raw.photos ?? [])
      .filter((photo) => photo.name)
      .slice(0, 4)
      .map((photo) => ({ name: photo.name!, by: photo.authorAttributions?.[0]?.displayName, byUrl: photo.authorAttributions?.[0]?.uri })),
    reviews: (raw.reviews ?? [])
      .map((review) => ({ rating: review.rating, text: (review.text?.text ?? review.originalText?.text ?? '').slice(0, 600), by: review.authorAttribution?.displayName, byUrl: review.authorAttribution?.uri, when: review.relativePublishTimeDescription }))
      .filter((review) => review.text)
      .slice(0, 3),
  };
}

const sameSite = (request: Request) => {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
};

export async function handlePlaceDetails(request: Request, key: string | undefined, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (!key) return reply(503, { error: 'Google details aren’t set up yet.' });
  if (!sameSite(request)) return reply(403, { error: 'Not allowed' });
  const url = new URL(request.url);
  const name = (url.searchParams.get('q') ?? '').trim().slice(0, 160);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return reply(400, { error: 'Send a name and a point.' });
  if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });
  try {
    const upstream = await fetchImpl('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key, 'x-goog-fieldmask': FIELDS },
      body: JSON.stringify({ textQuery: name, maxResultCount: 1, locationBias: { circle: { center: { latitude: lat, longitude: lon }, radius: 400 } } }),
    });
    if (!upstream.ok) return reply(502, { error: 'Google couldn’t be reached. Try again.' });
    const first = ((await upstream.json()) as { places?: RawPlace[] }).places?.[0];
    if (!first) return reply(200, { place: null }, 86_400);
    const { photoNames, ...place } = readPlace(first);
    // Each photo's own address, asked for without following it, so the key stays here.
    const photos = (
      await Promise.all(
        photoNames.map(async (photo) => {
          const media = await fetchImpl(`https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=900&skipHttpRedirect=true`, { headers: { 'x-goog-api-key': key } }).catch(() => undefined);
          const found = media?.ok ? ((await media.json()) as { photoUri?: string }).photoUri : undefined;
          return found ? { url: found, by: photo.by, byUrl: photo.byUrl } : undefined;
        }),
      )
    ).filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));
    return reply(200, { place: { ...place, photos } }, 86_400);
  } catch {
    return reply(502, { error: 'Google couldn’t be reached. Try again.' });
  }
}
