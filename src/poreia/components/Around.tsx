import { useMemo, useState } from 'react';
import { ChevronIcon } from '../../app/family/icons';
import { Placeholder } from '../../lamplight/Placeholder';
import { Waiting } from '../../lamplight/Waiting';
import type { PoreiaNav } from '../app/App';
import { settings, spots } from '../app/state';
import { dayText, Outbound, timeText } from '../app/ui';
import { eventsNear, guideSpots, nearby, travelReady } from '../app/world';
import type { Place } from '../core/model';
import { categoryLabel, distanceText, metersBetween, SPOT_CATEGORIES, type Spot, type SpotCategory } from '../core/spots';
import { useLoad } from './Destination';
import MapView, { type Pin } from './MapView';

type Shown = SpotCategory | 'saved';

// The kind last shown for each place, so coming back from a place's page shows the same list.
const lastShown = new Map<string, Shown>();

/*
 * What is around a place, in the app: a map and a list under one row of kinds. Each kind joins the guide's own
 * listings (Wikivoyage) with what OpenStreetMap has nearby; Events come from Ticketmaster when the site has its key;
 * Saved is what this trip kept. Tapping a pin or a row opens the place's page.
 */
export default function Around({ place, tripId, start, end, nav }: { place: Place; tripId?: string; start?: string; end?: string; nav: PoreiaNav }) {
  const unit = settings.use().temperature;
  const saved = spots.use().filter((each) => tripId && each.tripId === tripId);
  const memory = tripId ?? place.label ?? place.name;
  const [shown, setShownState] = useState<Shown>(() => lastShown.get(memory) ?? (saved.length ? 'saved' : 'see'));
  const setShown = (next: Shown) => {
    lastShown.set(memory, next);
    setShownState(next);
  };
  const [chosen, setChosen] = useState<string>();
  const center = place.lat !== undefined && place.lon !== undefined ? { lat: place.lat, lon: place.lon } : undefined;
  const placeKey = center ? `${center.lat.toFixed(3)},${center.lon.toFixed(3)}` : undefined;

  const guide = useLoad(placeKey && `guide.${place.label ?? place.name}`, () => guideSpots(place));
  const ready = useLoad('travel-ready', travelReady);
  const near = useLoad(center && shown !== 'saved' && shown !== 'event' ? `${shown}.${placeKey}` : undefined, () => nearby(shown as Exclude<SpotCategory, 'event'>, center!.lat, center!.lon));
  const events = useLoad(center && shown === 'event' && ready.value?.events && start ? `events.${placeKey}.${start}.${end}` : undefined, () => eventsNear(center!.lat, center!.lon, start!, end ?? start!));

  const list: Spot[] = useMemo(() => {
    if (shown === 'saved') return saved;
    if (shown === 'event') {
      return (events.value ?? []).map((event) => ({
        id: `event-${event.id}`,
        name: event.name,
        kind: event.kind ?? 'Event',
        category: 'event' as const,
        source: 'event' as const,
        lat: event.lat,
        lon: event.lon,
        address: event.venue,
        url: event.url,
        image: event.image,
        price: event.price,
        hours: [event.date && dayText(event.date), timeText(event.time)].filter(Boolean).join(', ') || undefined,
      }));
    }
    const fromGuide = (guide.value?.spots ?? []).filter((spot) => spot.category === shown);
    const names = new Set(fromGuide.map((spot) => spot.name.toLowerCase()));
    return [...fromGuide, ...(near.value ?? []).filter((spot) => !names.has(spot.name.toLowerCase()))];
  }, [shown, saved, guide.value, near.value, events.value]);

  if (!center) return null;
  const pins: Pin[] = list
    .filter((spot) => spot.lat !== undefined && spot.lon !== undefined)
    .slice(0, 120)
    .map((spot) => ({ id: spot.id, lat: spot.lat!, lon: spot.lon!, label: spot.name, category: shown === 'saved' ? 'saved' : spot.category }));
  const open = (spot: Spot) => nav.go({ name: 'place', spot, tripId });
  const kinds: { id: Shown; label: string }[] = [
    ...(saved.length ? [{ id: 'saved' as const, label: `Saved (${saved.length})` }] : []),
    ...SPOT_CATEGORIES,
    ...(start ? [{ id: 'event' as const, label: 'Events' }] : []),
  ];
  const loading = shown === 'event' ? events.loading || ready.loading : shown !== 'saved' && (near.loading || guide.loading);

  return (
    <section className="poreia-around">
      <div className="chip-row poreia-scroll-chips" role="group" aria-label="What to show">
        {kinds.map((each) => (
          <button
            key={each.id}
            type="button"
            className="chip"
            aria-pressed={shown === each.id}
            onClick={() => {
              setShown(each.id);
              setChosen(undefined);
            }}
          >
            {each.label}
          </button>
        ))}
      </div>
      <MapView center={center} pins={[{ id: 'here', lat: center.lat, lon: center.lon, label: place.name, category: 'home' }, ...pins]} chosen={chosen} onPick={(id) => {
        const spot = list.find((each) => each.id === id);
        if (spot && chosen === id) open(spot);
        else setChosen(id);
      }} label={`Map of ${place.name}`} />

      {loading && !list.length && <Placeholder label="Looking around" kind="rows" count={4} />}
      {loading && list.length > 0 && (
        <p className="muted">
          <Waiting>Looking around…</Waiting>
        </p>
      )}
      {shown === 'event' && ready.value && !ready.value.events && <p className="muted">Events aren’t set up here.</p>}
      {!loading && shown !== 'saved' && near.unreached && !list.length && <p className="muted">Couldn’t look around. Check the connection.</p>}
      {!loading && list.length === 0 && !near.unreached && <p className="muted">{shown === 'saved' ? 'Nothing saved yet.' : `No ${categoryLabel(shown).toLowerCase()} found here.`}</p>}

      {list.length > 0 && (
        <ul className="rows poreia-spots">
          {list.slice(0, 60).map((spot) => {
            const meters = metersBetween(center, spot);
            return (
              <li key={spot.id}>
                <button type="button" className={spot.id === chosen ? 'row is-chosen' : 'row'} onClick={() => open(spot)} onFocus={() => setChosen(spot.id)}>
                  {spot.image ? <img className="poreia-spots__photo" src={spot.image} alt="" /> : <span className={`poreia-spots__dot poreia-pin--${shown === 'saved' ? spot.category : spot.category}`} aria-hidden="true" />}
                  <span className="row__text">
                    <span>{spot.name}</span>
                    <span className="row__detail">{[spot.source === 'guide' ? 'Guide' : spot.kind, spot.price, spot.hours && spot.source === 'event' ? spot.hours : undefined, Number.isFinite(meters) ? distanceText(meters, unit) : undefined].filter(Boolean).join(' · ')}</span>
                  </span>
                  <ChevronIcon size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="fine">
        Map data © <Outbound href="https://www.openstreetmap.org/copyright">OpenStreetMap</Outbound> contributors, tiles by <Outbound href="https://openfreemap.org/">OpenFreeMap</Outbound>
        {guide.value ? (
          <>
            ; listings from <Outbound href={guide.value.url}>Wikivoyage</Outbound> (CC BY-SA)
          </>
        ) : null}
        {shown === 'event' && events.value ? '; events from Ticketmaster' : ''}.
      </p>
    </section>
  );
}
