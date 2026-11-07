import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon } from '../../app/family/icons';
import SwipeItem from '../../app/family/SwipeItem';
import { toLocalDate } from '../../core/scheduling/dates';
import { dayText, everyText, latestReading, markDone, type Due, type Thing, type Upkeep } from '../core/things';
import { useListPermissions } from '../../app/family/sharedLists';
import { actingMember, householdList } from './together';
import { putUpkeep, settings } from './state';

export function done(upkeep: Upkeep, thing?: Thing): void {
  tap();
  const reading = upkeep.distance ? latestReading(thing)?.value : undefined;
  const by = actingMember();
  putUpkeep(markDone(upkeep, toLocalDate(new Date()), { ...(reading !== undefined ? { reading } : {}), ...(by ? { by } : {}) }));
  offerUndo(`${upkeep.name} done`, () => putUpkeep(upkeep));
}

export function UpkeepRow({ upkeep, due, thing, today, onOpen, brief = false }: { upkeep: Upkeep; due: Due; thing?: Thing; today: string; onOpen: () => void; brief?: boolean }) {
  const unit = settings.use().distance;
  const can = useListPermissions(householdList()?.id);
  return (
    <SwipeItem className="chore" label="Done" off={!can.write} onSwipe={() => done(upkeep, thing)}>
      <button type="button" className="tick" aria-label={`${upkeep.name}: done`} disabled={!can.write} onClick={() => done(upkeep, thing)}>
        <CheckIcon size={20} />
      </button>
      <button type="button" className="chore__open" onClick={onOpen}>
        <span>{upkeep.name}</span>
        <small>{[thing?.name, brief ? undefined : everyText(upkeep.every), due.reading !== undefined ? `or at ${due.reading.toLocaleString()} ${unit}` : undefined].filter(Boolean).join(' · ')}</small>
      </button>
      <span className="chore__when">{dayText(due.date, today)}</span>
    </SwipeItem>
  );
}
