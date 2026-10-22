import { settings } from '../app/state';
import { metersBetween } from '../core/spots';
import type { Place } from '../core/model';
import { apartText, hoursApart } from '../core/timeZones';
import { PlaceScene } from './TripScene';

/** A long way, rounded and grouped: "3,190 mi" or "5,130 km". */
const far = (meters: number, unit: 'C' | 'F') => (unit === 'F' ? `${(Math.round(meters / 1609.344 / 10) * 10).toLocaleString()} mi` : `${(Math.round(meters / 10_000) * 10).toLocaleString()} km`);

const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** A place picked in Explore: its picture, its name, and how far it is from home in hours and in distance. */
export default function PlaceHeader({ place }: { place: Place }) {
  const prefs = settings.use();
  const home = prefs.home;
  const zone = home?.timezone ?? deviceZone();
  const apart = place.timezone ? hoursApart(zone, place.timezone, new Date()) : 0;
  const meters = home ? metersBetween(home, place) : Number.POSITIVE_INFINITY;
  const facts = [
    place.timezone ? (apart === 0 ? 'Same time as home' : apartText(apart)) : undefined,
    Number.isFinite(meters) && meters > 1000 ? `about ${far(meters, prefs.temperature)} from home` : undefined,
  ].filter(Boolean);
  return (
    <section className="card poreia-place-scene">
      <PlaceScene place={place} />
      <div className="poreia-place-scene__words">
        <h2 className="poreia-place-scene__name">{place.name}</h2>
        {place.label && place.label !== place.name && <p className="muted">{place.label.split(', ').slice(1).join(', ')}</p>}
        {facts.length > 0 && <p className="poreia-place-scene__facts">{facts.join(' · ').replace(/^./, (first) => first.toUpperCase())}</p>}
      </div>
    </section>
  );
}
