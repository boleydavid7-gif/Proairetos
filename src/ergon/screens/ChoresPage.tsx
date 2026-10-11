import { PlusIcon } from '../../app/family/icons';
import { toLocalDate } from '../../core/scheduling/dates';
import type { ErgonNav } from '../app/App';
import { useChores } from '../app/state';
import { ChoreList } from '../app/ui';
import { nextDay, type Chore } from '../core/chores';
import { Ideas } from './TodayPage';

export default function ChoresPage({ nav }: { nav: ErgonNav }) {
  const all = useChores();
  const today = toLocalDate(new Date());
  const rooms = new Map<string, Chore[]>();
  for (const chore of [...all].sort((a, b) => (nextDay(a) ?? '9999').localeCompare(nextDay(b) ?? '9999') || a.name.localeCompare(b.name))) {
    const room = chore.room || 'Anywhere';
    rooms.set(room, [...(rooms.get(room) ?? []), chore]);
  }
  const ordered = [...rooms].sort(([a], [b]) => (a === 'Anywhere' ? 1 : b === 'Anywhere' ? -1 : a.localeCompare(b)));

  return (
    <div className="page ergon-page">
      <div className="page-top section-head">
        <h1 className="title">Chores</h1>
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'chore' })}><PlusIcon size={18} />Add</button>
      </div>
      {all.length === 0 && <p className="muted">No chores yet.</p>}
      {ordered.map(([room, chores]) => (
        <section key={room} className="chore-group">
          <p className="label">{room}</p>
          <ChoreList chores={chores} today={today} onOpen={(chore) => nav.go({ name: 'chore', id: chore.id })} />
        </section>
      ))}
      {all.length > 0 && (
        <section className="chore-group">
          <p className="label">Ideas</p>
          <Ideas chores={all} />
        </section>
      )}
    </div>
  );
}
