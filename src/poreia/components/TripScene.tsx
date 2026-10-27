import { useMemo } from 'react';
import type { Place, Trip } from '../core/model';
import { hourAt, sceneKindFor, sceneSvg, sceneTimeAt } from '../core/scene';

function useSceneUrl(fallback: string, place: Place | undefined, small: boolean): string {
  const kind = sceneKindFor({ lat: place?.lat, elevation: place?.elevation, population: place?.population });
  const time = sceneTimeAt(hourAt(place?.timezone));
  const seed = place ? `${place.name}${place.countryCode ?? ''}` : fallback;
  return useMemo(() => {
    const svg = sceneSvg({ kind, time, seed, id: 'scene', small, ...(small ? { w: 240, h: 240 } : {}) });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [kind, time, seed, small]);
}

/** The picture at the top of a trip's page, drawn from where it goes (the stop chosen, on a trip with several). */
export function TripScene({ trip, place }: { trip: Trip; place?: Place }) {
  const url = useSceneUrl(trip.name, place ?? trip.place, false);
  return <img className="poreia-scene" src={url} alt="" aria-hidden="true" />;
}

/** The same picture, small, as a trip's tile in a list. */
export function SceneTile({ trip }: { trip: Trip }) {
  const url = useSceneUrl(trip.name, trip.place, true);
  return <img className="poreia-scene-tile" src={url} alt="" aria-hidden="true" />;
}

/** A place's picture on its own (Explore), the same as a trip there would have. */
export function PlaceScene({ place }: { place: Place }) {
  const url = useSceneUrl(place.name, place, false);
  return <img className="poreia-place-scene__image" src={url} alt="" aria-hidden="true" />;
}
