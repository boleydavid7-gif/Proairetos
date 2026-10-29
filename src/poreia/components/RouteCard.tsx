import { useEffect, useState } from 'react';
import { settings } from '../app/state';
import { datesText, Outbound } from '../app/ui';
import { driveMinutes } from '../app/world';
import { routeLink } from '../core/links';
import { placesOf, type Trip } from '../core/model';
import MapView, { type Pin } from './MapView';

const rad = Math.PI / 180;
/** Straight-line kilometers between two points. */
const kmBetween = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371;
};

const durationWords = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 >= 10 ? ` ${minutes % 60} min` : ''}`);

/** A trip with several stops on one map, joined in order, with each leg's distance and, overland, its drive. */
export function RouteCard({ trip }: { trip: Trip }) {
  const miles = settings.use().temperature === 'F';
  const stops = placesOf(trip).filter((stop) => stop.place.lat !== undefined && stop.place.lon !== undefined);
  const points = stops.map((stop) => ({ lat: stop.place.lat!, lon: stop.place.lon! }));
  const key = points.map((point) => `${point.lat},${point.lon}`).join(';');
  const [drives, setDrives] = useState<({ minutes: number; estimated: boolean } | undefined)[]>([]);
  useEffect(() => {
    let live = true;
    setDrives([]);
    // Overland legs only (under about 1,200 km): a drive is asked of the router, else estimated from the distance.
    const legs = points.slice(1).map((to, index) => (kmBetween(points[index], to) < 1200 ? driveMinutes(points[index], to).catch(() => undefined) : Promise.resolve(undefined)));
    void Promise.all(legs).then(
      (found) => live && setDrives(found),
    );
    return () => {
      live = false;
    };
  }, [key]);
  if (stops.length < 2) return null;
  const pins: Pin[] = stops.map((stop, index) => ({ id: stop.id, lat: stop.place.lat!, lon: stop.place.lon!, label: `${index + 1}. ${stop.place.name}`, category: 'saved' }));
  const distance = (km: number) => (miles ? `${Math.round(km * 0.621371).toLocaleString()} mi` : `${Math.round(km).toLocaleString()} km`);
  const total = points.slice(1).reduce((sum, point, index) => sum + kmBetween(points[index], point), 0);
  return (
    <section className="card poreia-route">
      <h2 className="card__title">The route</h2>
      <MapView center={points[0]} pins={pins} line={points} fit zoom={5} height="16rem" label={`The route: ${stops.map((stop) => stop.place.name).join(', ')}`} />
      <div className="button-row">
        <Outbound href={routeLink(stops.map((stop) => ({ name: stop.place.name, lat: stop.place.lat, lon: stop.place.lon })))} className="button-quiet">
          Open route in Maps
        </Outbound>
      </div>
      <ol className="poreia-route__legs">
        {stops.map((stop, index) => (
          <li key={stop.id}>
            <span className="poreia-route__stop">
              <span className="poreia-route__number">{index + 1}</span>
              {stop.place.name}
              {stop.start && <span className="muted"> · {datesText(stop.start, stop.end)}</span>}
            </span>
            {index < stops.length - 1 && (
              <span className="poreia-route__leg muted">
                {distance(kmBetween(points[index], points[index + 1]))}
                {drives[index] ? ` · ${drives[index]!.estimated ? 'estimated ' : ''}${durationWords(drives[index]!.minutes)} by car` : ''}
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="fine">{distance(total)} in all as the crow flies.</p>
    </section>
  );
}
