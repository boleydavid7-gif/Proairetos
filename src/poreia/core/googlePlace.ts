/** A place's details from Google, as the site gives them (worker/placeDetails.ts). */
export type GooglePlace = {
  id: string;
  name: string;
  rating?: number;
  ratings?: number;
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

/** "4.6 · 1,234 reviews · $$ · Open now". */
export function placeLine(place: Pick<GooglePlace, 'rating' | 'ratings' | 'price' | 'openNow'>): string {
  return [
    place.rating !== undefined ? `${place.rating.toFixed(1)} ★` : undefined,
    place.ratings ? `${place.ratings.toLocaleString()} ${place.ratings === 1 ? 'review' : 'reviews'}` : undefined,
    place.price ? '$'.repeat(place.price) : undefined,
    place.openNow === undefined ? undefined : place.openNow ? 'Open now' : 'Closed now',
  ]
    .filter(Boolean)
    .join(' · ');
}
