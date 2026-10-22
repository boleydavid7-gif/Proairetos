import YearPage from '../../app/family/YearPage';
import { BackLink } from '../../askesis/app/ui';
import type { PoreiaNav } from '../app/App';
import { bookings, timeOff, today, trips } from '../app/state';
import MapView, { type Pin } from '../components/MapView';
import RouteEmpty from '../components/RouteEmpty';
import { countriesBeen, placesBeen, poreiaDates, poreiaYear } from '../core/year';

/** Every place from trips already begun on one map, the countries as a list, and Your year. */
export default function BeenPage({ nav }: { nav: PoreiaNav }) {
  const list = trips.use();
  const day = today();
  const places = placesBeen(list, day);
  const countries = countriesBeen(list, day);
  const pins: Pin[] = places
    .filter((each) => each.place.lat !== undefined && each.place.lon !== undefined)
    .map((each, index) => ({ id: `been-${index}`, lat: each.place.lat!, lon: each.place.lon!, label: `${each.place.name}${each.trips > 1 ? `, ${each.trips} trips` : ''}`, category: 'saved' }));
  return (
    <div className="page poreia-page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Where you’ve been</h1>
      {places.length === 0 ? (
        <RouteEmpty glyph="pin" title="No trips yet" line="Places from trips you’ve taken show here." />
      ) : (
        <>
          {pins.length > 0 && <MapView center={pins[0]} pins={pins} zoom={2} fit height="22rem" label="Places you’ve been" />}
          <p className="muted">
            {places.length} {places.length === 1 ? 'place' : 'places'}
            {countries.length ? ` in ${countries.length} ${countries.length === 1 ? 'country' : 'countries'}` : ''}
          </p>
          {countries.length > 0 && (
            <section className="card">
              <h2 className="card__title">Countries</h2>
              <ul className="detail-list">
                {countries.map((country) => (
                  <li key={country.code}>
                    <span>{country.name}</span>
                    <span className="muted">
                      {places
                        .filter((each) => each.place.countryCode?.toUpperCase() === country.code)
                        .map((each) => each.place.name)
                        .join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'year' })}>
        Your year
      </button>
    </div>
  );
}

/** Poreia's Your year: trips, nights away, places, countries, flights and time off taken. */
export function YearScreen({ nav }: { nav: PoreiaNav }) {
  const list = trips.use();
  const all = bookings.use();
  const offs = timeOff.use();
  return <YearPage className="poreia-page" dates={poreiaDates(list)} build={(year) => poreiaYear(list, all, offs, year, today())} onBack={nav.back} />;
}
