import type { Nav } from '../app/App';
import { CalendarIcon, ChevronIcon, DiscoverIcon, MoreIcon, PtoIcon, TripsIcon } from '../app/icons';
import { PageTop, PoreiaHeader } from '../app/ui';

export default function MorePage({ nav }: { nav: Nav }) {
  return <div className="page poreia-page"><PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button></PageTop><PoreiaHeader eyebrow="Travel tools and account" title="More" />
    <div className="page page--under-hero poreia-more">
      <section className="poreia-section"><div className="poreia-section-head"><h2>Plan with confidence</h2><MoreIcon size={22} /></div><div className="poreia-list poreia-list--menu">
        <button type="button" className="poreia-row poreia-row--button" onClick={() => nav.go({ name: 'vacation' })}><PtoIcon size={22} /><span className="poreia-row__text"><strong>Vacation Time</strong><small>Balances, accruals, requests, history, and future projections</small></span><ChevronIcon size={18} /></button>
        <button type="button" className="poreia-row poreia-row--button" onClick={() => nav.swap({ name: 'calendar' })}><CalendarIcon size={22} /><span className="poreia-row__text"><strong>Calendar and commitments</strong><small>Work schedules, leave, family dates, and travel in one view</small></span><ChevronIcon size={18} /></button>
        <button type="button" className="poreia-row poreia-row--button" onClick={() => nav.swap({ name: 'discover' })}><DiscoverIcon size={22} /><span className="poreia-row__text"><strong>Saved places</strong><small>Destination ideas and research you have collected</small></span><ChevronIcon size={18} /></button>
      </div></section>
      <section className="card poreia-card poreia-section"><div className="poreia-section-head"><h2>Family workspace</h2><TripsIcon size={22} /></div><p className="muted">Trips, travel dates, and preparation records use the shared Proairetos account and remain available across the family apps you have added.</p></section>
      <section className="card poreia-empty"><p className="muted">Poreia keeps the current itinerary and essential trip records available offline. Documents, packing lists, and shared tasks are the next workspace modules to add here.</p></section>
    </div>
  </div>;
}
