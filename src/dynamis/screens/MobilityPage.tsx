import { toLocalDate } from '../../core/scheduling/dates';
import type { DynamisNav } from '../app/App';
import { mobility } from '../app/state';
import { ROUTINES, routineMinutes, weekMobility } from '../core/mobility';
import { weekDays } from '../core/plan';

export default function MobilityPage({ nav }: { nav: DynamisNav }) {
  const logs = mobility.use();
  const week = weekMobility(logs, weekDays({ days: [0, 1, 2, 3, 4, 5, 6] }, toLocalDate(new Date())));
  return (
    <div className="page dynamis-page">
      <div className="page-top"><h1 className="title">Mobility</h1></div>
      <ul className="chore-list">
        {ROUTINES.map((routine) => (
          <li key={routine.id} className="chore">
            <button type="button" className="chore__open" onClick={() => nav.go({ name: 'guide', routine: routine.id })}>
              <span>{routine.name}</span>
              <small>{routine.when}</small>
            </button>
            <span className="chore__when">{routineMinutes(routine)} min</span>
          </li>
        ))}
      </ul>
      {week.days > 0 && <p className="fine">This week: {week.days === 1 ? 'one day' : `${week.days} days`}, {week.minutes} min.</p>}
    </div>
  );
}
