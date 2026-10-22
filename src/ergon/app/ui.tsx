import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon } from '../../app/family/icons';
import SwipeItem from '../../app/family/SwipeItem';
import { dayText, markDone, nextDay, repeatText, shownDay, type Chore, type DaysOff } from '../core/chores';
import { myName, putChore } from './state';

export function done(chore: Chore, today: string): void {
  tap();
  putChore(markDone(chore, today, myName() || chore.who));
  offerUndo(`${chore.name} done`, () => putChore(chore));
}

export function ChoreRow({ chore, today, onOpen, room = true, daysOff }: { chore: Chore; today: string; onOpen: () => void; room?: boolean; daysOff?: DaysOff }) {
  const day = nextDay(chore, daysOff);
  return (
    <SwipeItem className="chore" label="Done" onSwipe={() => done(chore, today)}>
      <button type="button" className="tick" aria-label={`${chore.name}: done`} onClick={() => done(chore, today)}>
        <CheckIcon size={20} />
      </button>
      <button type="button" className="chore__open" onClick={onOpen}>
        <span>
          {chore.name}
          {chore.who && <span className="who-chip">{chore.who}</span>}
        </span>
        <small>{[room ? chore.room : undefined, repeatText(chore.repeat)].filter(Boolean).join(' · ')}</small>
      </button>
      <span className="chore__when">{day ? dayText(shownDay(chore, day, today), today) : ''}</span>
    </SwipeItem>
  );
}

export function ChoreList({ chores, today, onOpen, room = true, daysOff }: { chores: readonly Chore[]; today: string; onOpen: (chore: Chore) => void; room?: boolean; daysOff?: DaysOff }) {
  return (
    <ul className="chore-list">
      {chores.map((chore) => <ChoreRow key={chore.id} chore={chore} today={today} onOpen={() => onOpen(chore)} room={room} daysOff={daysOff} />)}
    </ul>
  );
}
