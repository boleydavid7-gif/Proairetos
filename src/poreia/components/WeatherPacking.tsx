import { useEffect, useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { daysBetween } from '../../core/scheduling/dates';
import { newId, nowStamp, packing, settings, today } from '../app/state';
import { degrees, forecast, lastYear } from '../app/world';
import { placesOf, type Trip } from '../core/model';
import { offersLeft, weatherOffers, type WeatherDays } from '../core/packing';

const ASIDE = 'poreiaPackAside.';
const setAsideFor = (tripId: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(ASIDE + tripId) ?? '[]') as string[];
  } catch {
    return [];
  }
};

/** The trip's days at each of its places: the forecast within 16 days, else the same days last year. */
async function tripWeather(trip: Trip): Promise<WeatherDays | undefined> {
  if (!trip.start) return undefined;
  const end = trip.end ?? trip.start;
  const near = daysBetween(today(), trip.start) <= 15;
  // A changeover day belongs to both stops; each date counts once.
  const byDate = new Map<string, WeatherDays['days'][number]>();
  for (const stop of placesOf(trip)) {
    const { lat, lon } = stop.place;
    if (lat === undefined || lon === undefined) continue;
    const from = stop.start ?? trip.start;
    const until = stop.end ?? end;
    const found = near ? (await forecast(lat, lon)).filter((day) => day.date >= from && day.date <= until) : await lastYear(lat, lon, from, until);
    for (const day of found) if (!byDate.has(day.date)) byDate.set(day.date, day);
  }
  const days = [...byDate.values()];
  return days.length ? { source: near ? 'forecast' : 'last-year', days } : undefined;
}

/** Things the weather points to, each with why; one tap adds it, "Not for this trip" sets the rest aside. */
export function WeatherPacking({ trip }: { trip: Trip }) {
  const unit = settings.use().temperature;
  const listed = packing.use().filter((each) => each.tripId === trip.id).map((each) => each.name);
  const [weather, setWeather] = useState<WeatherDays>();
  const [aside, setAside] = useState(() => setAsideFor(trip.id));
  useEffect(() => {
    let live = true;
    void tripWeather(trip)
      .then((found) => live && setWeather(found))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [trip.id, trip.start, trip.end]);
  if (!weather) return null;
  const offers = offersLeft(weatherOffers(weather, (celsius) => degrees(celsius, unit)), listed, aside);
  if (!offers.length) return null;
  const why = [...new Set(offers.map((offer) => offer.why))];
  return (
    <section className="card poreia-weather-pack">
      <h2 className="card__title">For the weather</h2>
      <p className="muted">{why.join(' · ')}</p>
      <div className="chip-row">
        {offers.map((offer) => (
          <button
            key={offer.name}
            type="button"
            className="chip"
            onClick={() => {
              const item = { id: newId(), tripId: trip.id, name: offer.name, group: offer.group, packed: false, createdAt: nowStamp() };
              packing.put(item);
              offerUndo(`“${offer.name}” added`, () => packing.remove(item.id));
            }}
          >
            {offer.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="text-link"
        onClick={() => {
          const next = [...aside, ...offers.map((offer) => offer.name)];
          try {
            localStorage.setItem(ASIDE + trip.id, JSON.stringify(next));
          } catch {
            // Kept for this visit only.
          }
          setAside(next);
          offerUndo('Set aside for this trip', () => {
            try {
              localStorage.setItem(ASIDE + trip.id, JSON.stringify(aside));
            } catch {
              // Kept for this visit only.
            }
            setAside(aside);
          });
        }}
      >
        Not for this trip
      </button>
    </section>
  );
}
