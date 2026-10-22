import { useEffect, useState } from 'react';
import type { Place, Trip } from '../core/model';
import { trips } from './state';
import { findPlaces } from './world';

/*
 * A place kept as words only (typed and not picked, or from the first version) has no map point, time zone or
 * country, so the map, Around, weather, the country card and the picture wait on it. It is looked up by its words
 * once and the first match's facts are filled in, keeping the person's own name for it.
 */

export const located = (place?: Place) => place?.lat !== undefined && place.lon !== undefined;

export async function locatePlace(place: Place): Promise<Place | undefined> {
  if (located(place)) return place;
  const found = (await findPlaces(place.label ?? place.name).catch(() => [] as Place[]))[0] ?? (place.label ? (await findPlaces(place.name).catch(() => [] as Place[]))[0] : undefined);
  if (!found) return undefined;
  return { ...found, name: place.name || found.name, label: place.label ?? found.label };
}

/** Fills in a trip's places that have no map point, and keeps them on the trip. */
export function useLocatedTrip(trip: Trip | undefined): void {
  const missing = trip ? [trip.place, ...(trip.stops ?? []).map((stop) => stop.place)].filter((place) => place && !located(place)).length : 0;
  useEffect(() => {
    if (!trip || !missing) return;
    let live = true;
    void (async () => {
      const place = trip.place && !located(trip.place) ? await locatePlace(trip.place) : trip.place;
      const stops = trip.stops ? await Promise.all(trip.stops.map(async (stop) => (located(stop.place) ? stop : { ...stop, place: (await locatePlace(stop.place)) ?? stop.place }))) : undefined;
      if (!live) return;
      const current = trips.get(trip.id);
      if (!current) return;
      const changed = place !== current.place || (stops ?? []).some((stop, index) => stop.place !== current.stops?.[index]?.place);
      if (changed && (located(place) || stops?.some((stop) => located(stop.place)))) trips.put({ ...current, place, ...(stops ? { stops } : {}) });
    })();
    return () => {
      live = false;
    };
  }, [trip?.id, missing]);
}

/** The same for a place that is not kept on a trip (Explore). */
export function useLocatedPlace(place: Place | undefined): Place | undefined {
  const [found, setFound] = useState<Place>();
  useEffect(() => {
    setFound(undefined);
    if (!place || located(place)) return;
    let live = true;
    void locatePlace(place).then((value) => live && setFound(value));
    return () => {
      live = false;
    };
  }, [place?.name, place?.label, place?.lat]);
  return place && !located(place) ? (found ?? place) : place;
}
