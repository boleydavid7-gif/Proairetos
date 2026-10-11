import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon } from '../../app/family/icons';
import { dayText, markDone, nextDay, repeatText, type Chore } from '../core/chores';
import { putChore, settings } from './state';

export function done(chore: Chore, today: string): void {
  tap();
  putChore(markDone(chore, today, settings.load().me || chore.who));
  offerUndo(`${chore.name} done`, () => putChore(chore));
}

export function ChoreRow({ chore, today, onOpen }: { chore: Chore; today: string; onOpen: () => void }) {
  const day = nextDay(chore);
  return (
    <li className="chore">
      <button type="button" className="tick" aria-label={`${chore.name}: done`} onClick={() => done(chore, today)}>
        <CheckIcon size={20} />
      </button>
      <button type="button" className="chore__open" onClick={onOpen}>
        <span>
          {chore.name}
          {chore.who && <span className="who-chip">{chore.who}</span>}
        </span>
        <small>{[chore.room, repeatText(chore.repeat)].filter(Boolean).join(' · ')}</small>
      </button>
      <span className="chore__when">{day ? dayText(day, today) : ''}</span>
    </li>
  );
}

export function ChoreList({ chores, today, onOpen }: { chores: readonly Chore[]; today: string; onOpen: (chore: Chore) => void }) {
  return (
    <ul className="chore-list">
      {chores.map((chore) => <ChoreRow key={chore.id} chore={chore} today={today} onOpen={() => onOpen(chore)} />)}
    </ul>
  );
}
