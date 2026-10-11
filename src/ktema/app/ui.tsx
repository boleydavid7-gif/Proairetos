import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon } from '../../app/family/icons';
import { toLocalDate } from '../../core/scheduling/dates';
import { dayText, everyText, latestReading, markDone, type Due, type Thing, type Upkeep } from '../core/things';
import { putUpkeep, settings } from './state';

export function done(upkeep: Upkeep, thing?: Thing): void {
  tap();
  const reading = upkeep.distance ? latestReading(thing)?.value : undefined;
  putUpkeep(markDone(upkeep, toLocalDate(new Date()), reading !== undefined ? { reading } : {}));
  offerUndo(`${upkeep.name} done`, () => putUpkeep(upkeep));
}

export function UpkeepRow({ upkeep, due, thing, today, onOpen }: { upkeep: Upkeep; due: Due; thing?: Thing; today: string; onOpen: () => void }) {
  const unit = settings.use().distance;
  return (
    <li className="chore">
      <button type="button" className="tick" aria-label={`${upkeep.name}: done`} onClick={() => done(upkeep, thing)}>
        <CheckIcon size={20} />
      </button>
      <button type="button" className="chore__open" onClick={onOpen}>
        <span>{upkeep.name}</span>
        <small>{[thing?.name, everyText(upkeep.every), due.reading !== undefined ? `or at ${due.reading.toLocaleString()} ${unit}` : undefined].filter(Boolean).join(' · ')}</small>
      </button>
      <span className="chore__when">{dayText(due.date, today)}</span>
    </li>
  );
}
