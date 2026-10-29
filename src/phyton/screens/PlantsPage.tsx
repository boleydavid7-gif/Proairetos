import { useState } from 'react';
import { CameraIcon, LeafIcon, PlusIcon } from '../../app/family/icons';
import { Empty } from '../../app/family/shell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { PhytonNav } from '../app/App';
import { settings, usePlants } from '../app/state';
import { useRain } from '../app/rain';
import { PlantList, wateredAll } from '../app/ui';
import { nextCheck, type Plant } from '../core/plants';

export default function PlantsPage({ nav }: { nav: PhytonNav }) {
  const all = usePlants();
  const current = settings.use();
  const rain = useRain(current.rain);
  const today = toLocalDate(new Date());
  const places = new Map<string, Plant[]>();
  const sorted = [...all].sort((a, b) => nextCheck(a, today, current.hemisphere, rain).localeCompare(nextCheck(b, today, current.hemisphere, rain)) || a.name.localeCompare(b.name));
  for (const plant of sorted) {
    const place = plant.place || 'Anywhere';
    places.set(place, [...(places.get(place) ?? []), plant]);
  }
  const ordered = [...places].sort(([a], [b]) => (a === 'Anywhere' ? 1 : b === 'Anywhere' ? -1 : a.localeCompare(b)));
  const [only, setOnly] = useState('');
  const shownPlace = only && places.has(only) ? only : '';

  return (
    <div className="page phyton-page">
      <div className="page-top section-head">
        <h1 className="title">Plants</h1>
        <div className="button-row">
          <button type="button" className="button-quiet" aria-label="Identify a plant" onClick={() => nav.go({ name: 'identify' })}><CameraIcon size={18} /></button>
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'add' })}><PlusIcon size={18} />Add</button>
        </div>
      </div>
      {all.length === 0 && <Empty icon={<LeafIcon size={28} />} title="No plants yet" />}
      {ordered.length > 1 && (
        <div className="chip-row" role="group" aria-label="Place">
          <button type="button" className="chip" aria-pressed={!shownPlace} onClick={() => setOnly('')}>All places</button>
          {ordered.map(([place]) => <button key={place} type="button" className="chip" aria-pressed={shownPlace === place} onClick={() => setOnly(place)}>{place}</button>)}
        </div>
      )}
      {ordered.filter(([place]) => !shownPlace || place === shownPlace).map(([place, plants]) => (
        <section key={place} className="chore-group">
          <div className="section-head plant-room">
            <p className="label">{place}</p>
            {plants.length > 1 && (
              <button type="button" className="text-link" onClick={() => wateredAll(plants, today, place === 'Anywhere' ? 'Plants' : place)}>
                Watered all
              </button>
            )}
          </div>
          <PlantList plants={plants} today={today} place={place === 'Anywhere'} onOpen={(plant) => nav.go({ name: 'plant', id: plant.id })} />
        </section>
      ))}
    </div>
  );
}
