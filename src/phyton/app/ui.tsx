import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { DropIcon, LeafIcon } from '../../app/family/icons';
import SwipeItem from '../../app/family/SwipeItem';
import { dayText, nextCheck, stillMoist, water, wateredText, type Plant } from '../core/plants';
import { useLatestPhoto } from '../data/photos';
import { myName, putPlant, settings } from './state';
import { useRain } from './rain';

export function watered(plant: Plant, today: string): void {
  tap();
  putPlant(water(plant, today, myName() || plant.who));
  offerUndo(`${plant.name} watered`, () => putPlant(plant));
}

export function moist(plant: Plant, today: string): void {
  putPlant(stillMoist(plant, today, myName() || plant.who));
  offerUndo(`${plant.name}: a few more days`, () => putPlant(plant));
}

export function PlantThumb({ plant, size = 44 }: { plant: Plant; size?: number }) {
  const photo = useLatestPhoto(plant.id);
  return (
    <span className="plant-thumb" style={{ width: size, height: size }} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : <LeafIcon size={Math.round(size * 0.5)} />}
    </span>
  );
}

export function PlantRow({ plant, today, onOpen, place = true }: { plant: Plant; today: string; onOpen: () => void; place?: boolean }) {
  const current = settings.use();
  const rain = useRain(current.rain);
  const day = nextCheck(plant, today, current.hemisphere, rain);
  return (
    <SwipeItem className="chore plant-row" label="Watered" onSwipe={() => watered(plant, today)}>
      <button type="button" className="tick" aria-label={`${plant.name}: watered`} onClick={() => watered(plant, today)}>
        <DropIcon size={19} />
      </button>
      <button type="button" className="chore__open" onClick={onOpen}>
        <span className="chore__name">
          <PlantThumb plant={plant} size={34} />
          {plant.name}
          {plant.who && <span className="who-chip">{plant.who}</span>}
        </span>
        <small>{[place ? plant.place : undefined, wateredText(plant, today, rain)].filter(Boolean).join(' · ')}</small>
      </button>
      <span className="chore__when">{dayText(day, today)}</span>
    </SwipeItem>
  );
}

export function PlantList({ plants, today, onOpen, place = true }: { plants: readonly Plant[]; today: string; onOpen: (plant: Plant) => void; place?: boolean }) {
  return (
    <ul className="chore-list">
      {plants.map((plant) => <PlantRow key={plant.id} plant={plant} today={today} onOpen={() => onOpen(plant)} place={place} />)}
    </ul>
  );
}
