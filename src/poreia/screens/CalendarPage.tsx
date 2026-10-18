import { useMemo } from 'react';
import type { Nav } from '../app/App';
import { CalendarIcon, PtoIcon, WorkIcon } from '../app/icons';
import { useLeaveRequests, useWorkProfiles } from '../app/state';
import { addDays, dateText, parseDate, workHoursOn } from '../core/pto';
import { PageTop, PoreiaHeader } from '../app/ui';

function labelFor(date: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(parseDate(date));
}

export default function CalendarPage({ nav }: { nav: Nav }) {
  const profiles = useWorkProfiles();
  const requests = useLeaveRequests();
  const profile = profiles[0];
  const start = useMemo(() => dateText(new Date()), []);
  const dates = useMemo(() => Array.from({ length: 21 }, (_, index) => addDays(start, index)), [start]);
  return <div className="page poreia-page"><PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button></PageTop><PoreiaHeader eyebrow="Plan around real commitments" title="Calendar"><button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'pto' })}><PtoIcon size={18} /> PTO</button></PoreiaHeader>
    <div className="page page--under-hero">
      {!profile ? <section className="card poreia-empty"><CalendarIcon size={28} /><h2 className="card__title">Add your work schedule first</h2><p className="muted">Once Poreia knows which days you work, this calendar can show the leave cost of a trip.</p><button type="button" className="button-main" onClick={() => nav.swap({ name: 'pto' })}>Set up schedule</button></section> : <>
        <section className="card poreia-card poreia-section"><div className="poreia-section-head"><h2>Next three weeks</h2><span className="label">{profile.timezone}</span></div><div className="poreia-list">{dates.map((date) => { const hours = workHoursOn(date, profile); const leave = requests.find((request) => request.startDate <= date && request.endDate >= date && request.status !== 'denied' && request.status !== 'canceled'); return <div className="poreia-row" key={date}><span className="poreia-row__text"><strong>{labelFor(date)}</strong><small>{leave ? `${leave.status[0].toUpperCase() + leave.status.slice(1)} leave` : hours ? `${hours} scheduled work hours` : 'No scheduled work'}</small></span>{leave ? <PtoIcon size={20} /> : hours ? <WorkIcon size={20} /> : <span className="muted">—</span>}</div>; })}</div></section>
        <section className="poreia-section"><div className="poreia-section-head"><h2>Planning note</h2></div><p className="muted">This view uses your manual schedule and leave records. Employer calendars and family commitments can be added as integrations later without changing the dates you enter here.</p></section>
      </>}
    </div>
  </div>;
}
