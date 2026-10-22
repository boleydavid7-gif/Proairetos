import { useState } from 'react';
import { say } from '../../app/family/shell';
import { Waiting } from '../../lamplight/Waiting';
import { keepForOffline, keptFor } from '../app/offline';
import { dayText } from '../app/ui';
import { placesOf, type Trip } from '../core/model';

/** Keeps the trip's map, guide and places nearby on this device, for a flight or a place without signal. */
export default function OfflineCard({ trip }: { trip: Trip }) {
  const [kept, setKept] = useState(() => keptFor(trip.id));
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const names = placesOf(trip).filter((stop) => stop.place.lat !== undefined).map((stop) => stop.place.name);
  if (!names.length) return null;
  const where = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  const keep = async () => {
    setProgress({ done: 0, total: 1 });
    const { missed } = await keepForOffline(trip, (done, total) => setProgress({ done, total }));
    setProgress(undefined);
    setKept(keptFor(trip.id));
    say(missed ? `Kept for offline; ${missed} ${missed === 1 ? 'part' : 'parts'} couldn’t be reached` : 'Kept for offline');
  };

  return (
    <section className="card">
      <h2 className="card__title">Offline</h2>
      {progress ? (
        <p className="muted" role="status">
          <Waiting>
            Keeping {progress.done} of {progress.total}…
          </Waiting>
        </p>
      ) : (
        <p className="muted">{kept ? `Kept ${dayText(kept.at.slice(0, 10))}: the map around ${where}, the guide and places nearby.` : `The map around ${where}, the guide and places nearby, on this device.`}</p>
      )}
      <button type="button" className="button-quiet" disabled={Boolean(progress)} onClick={keep}>
        {kept ? 'Keep again' : 'Keep for offline'}
      </button>
    </section>
  );
}
