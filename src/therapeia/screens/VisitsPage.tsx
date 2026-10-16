import { PlusIcon, VisitIcon } from '../../app/family/icons';
import { Empty } from '../../app/family/shell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { TherapeiaNav } from '../app/App';
import { appointments } from '../app/state';
import { at, dayWord } from '../app/ui';
import { splitAppointments, type Appointment } from '../core/medicines';

function VisitRow({ visit, today, onOpen }: { visit: Appointment; today: string; onOpen: () => void }) {
  const when = new Date(visit.at);
  return (
    <li className="chore">
      <button type="button" className="chore__open" onClick={onOpen}>
        <span>{visit.with}</span>
        <small>{[visit.where, visit.notes ? 'Notes kept' : undefined].filter(Boolean).join(' · ')}</small>
      </button>
      <span className="chore__when">{dayWord(when, today)} {at(when)}</span>
    </li>
  );
}

export default function VisitsPage({ nav }: { nav: TherapeiaNav }) {
  const all = appointments.use();
  const now = new Date();
  const today = toLocalDate(now);
  const { coming, past } = splitAppointments(all, now);
  return (
    <div className="page therapeia-page">
      <div className="page-top section-head">
        <h1 className="title">Visits</h1>
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'visit' })}><PlusIcon size={18} />Add</button>
      </div>
      {coming.length ? (
        <ul className="chore-list">{coming.map((visit) => <VisitRow key={visit.id} visit={visit} today={today} onOpen={() => nav.go({ name: 'visit', id: visit.id })} />)}</ul>
      ) : (
        <Empty icon={<VisitIcon size={28} />} title="Nothing coming up" line="Appointments, with the questions to ask." />
      )}
      {past.length > 0 && (
        <>
          <div className="section-head"><h2>Before</h2></div>
          <ul className="chore-list">{past.slice(0, 20).map((visit) => <VisitRow key={visit.id} visit={visit} today={today} onOpen={() => nav.go({ name: 'visit', id: visit.id })} />)}</ul>
        </>
      )}
    </div>
  );
}
