import { BroomIcon, PlusIcon } from '../../app/family/icons';
import IconButton from '../../components/ui/IconButton';
import { Empty } from '../../app/family/shell';
import { useHousehold } from '../../app/household/household';
import { toLocalDate } from '../../core/scheduling/dates';
import type { ErgonNav } from '../app/App';
import { useChores, useHome } from '../app/state';
import { useListPermissions } from '../../app/family/sharedLists';
import { ChoreList } from '../app/ui';
import { nextDay, type Chore, type ChorePerson } from '../core/chores';
import { useDaysOff } from '../app/daysOff';
import { Ideas } from './TodayPage';

export default function ChoresPage({ nav }: { nav: ErgonNav }) {
  const all = useChores();
  const can = useListPermissions(useHome()?.id);
  const daysOff = useDaysOff();
  const family = useHousehold();
  const familyPeople: ChorePerson[] = family.parts.some((part) => part.app === 'ergon')
    ? family.members.map((member) => ({ id: member.id.slice('member:'.length), name: member.name }))
    : [];
  const today = toLocalDate(new Date());
  const active = all.filter((chore) => nextDay(chore, daysOff));
  const rooms = new Map<string, Chore[]>();
  for (const chore of [...active].sort((a, b) => (nextDay(a, daysOff) ?? '9999').localeCompare(nextDay(b, daysOff) ?? '9999') || a.name.localeCompare(b.name))) {
    const room = chore.room || 'Anywhere';
    rooms.set(room, [...(rooms.get(room) ?? []), chore]);
  }
  const ordered = [...rooms].sort(([a], [b]) => (a === 'Anywhere' ? 1 : b === 'Anywhere' ? -1 : a.localeCompare(b)));

  return (
    <div className="page ergon-page">
      <div className="page-top section-head">
        <h1 className="title">Chores</h1>
        {can.write && <span data-header-actions><IconButton className="round-button" label="Add a chore" onClick={() => nav.go({ name: 'chore' })}><PlusIcon size={22} /></IconButton></span>}
      </div>
      {active.length === 0 && <Empty icon={<BroomIcon size={28} />} title={all.length === 0 ? 'No chores yet' : 'No active chores'} />}
      {ordered.map(([room, chores]) => (
        <section key={room} className="chore-group">
          <p className="label">{room}</p>
          <ChoreList chores={chores} today={today} room={room === 'Anywhere'} daysOff={daysOff} onOpen={(chore) => nav.go({ name: 'chore', id: chore.id })} people={familyPeople} />
        </section>
      ))}
      <section className="chore-group">
        <p className="label">Ideas</p>
        <Ideas chores={all} />
      </section>
    </div>
  );
}
