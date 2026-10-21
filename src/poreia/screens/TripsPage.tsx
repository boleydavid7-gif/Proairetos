import { Brand } from '../../app/family/shell';
import { AppMark, PlusIcon } from '../../app/family/icons';
import { DailyLine } from '../../app/family/DailyLine';
import photo from '../../assets/images/scenes/poreia.webp';
import photoWide from '../../assets/images/scenes/poreia-wide.webp';
import type { PoreiaNav } from '../app/App';
import { settings, timeOff, today, trips } from '../app/state';
import { NextUpCard } from './TripPage';
import { datesText, dayText, TripRow } from '../app/ui';
import { phaseOf, phaseText, sortTrips } from '../core/model';
import { balanceOn, hoursText } from '../core/timeOff';

export default function TripsPage({ nav }: { nav: PoreiaNav }) {
  const list = trips.use();
  const offs = timeOff.use();
  const setup = settings.use().timeOff;
  const day = today();
  const { now, ahead, someday, past } = sortTrips(list, day);
  const lead = now[0] ?? ahead[0];
  const leadPhase = lead ? phaseOf(lead, day) : undefined;
  const open = (id: string) => nav.go({ name: 'trip', id });

  return (
    <div className="home poreia-home">
      <div className="hero hero--tall hero-shade-soft">
        <picture>
          <source media="(min-width: 62rem)" srcSet={photoWide} />
          <img className="hero__image" src={photo} alt="" />
        </picture>
        <div className="hero__shade" />
        <div className="hero__content">
          <Brand name="Poreia" mark={<AppMark app="poreia" size={30} light />} light />
          <div className="home__words">
            <h1 className="home__title">{lead ? lead.name : 'Trips'}</h1>
            <p className="home__sub">{lead ? [phaseText(phaseOf(lead, day)), datesText(lead.start, lead.end)].filter(Boolean).join(' · ') : 'Where to next?'}</p>
          </div>
        </div>
      </div>

      <div className="page page--under-hero">
        {list.length === 0 ? (
          <section className="card first-run">
            <p className="muted">Start with a place, or just an idea.</p>
            <div className="button-row">
              <button type="button" className="button-main" onClick={() => nav.go({ name: 'trip-form' })}>
                <PlusIcon size={18} />
                Plan a trip
              </button>
              <button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'explore' })}>
                Explore places
              </button>
            </div>
          </section>
        ) : (
          <>
            {lead && (leadPhase?.kind === 'now' || (leadPhase?.kind === 'ahead' && leadPhase.days <= 30)) && <NextUpCard trip={lead} nav={nav} day={day} home />}

            <div className="section-head">
              <h2>{now.length ? 'Coming up' : 'Trips'}</h2>
              <button type="button" className="text-link" onClick={() => nav.go({ name: 'trip-form' })}>
                Plan a trip
              </button>
            </div>
            {[...now.slice(1), ...ahead].length > 0 ? (
              <ul className="rows">{[...now.slice(1), ...ahead].map((trip) => <TripRow key={trip.id} trip={trip} today={day} onOpen={() => open(trip.id)} />)}</ul>
            ) : (
              <p className="muted">Nothing booked ahead.</p>
            )}

            {someday.length > 0 && (
              <>
                <div className="section-head">
                  <h2>Ideas</h2>
                </div>
                <ul className="rows">{someday.map((trip) => <TripRow key={trip.id} trip={trip} today={day} onOpen={() => open(trip.id)} />)}</ul>
              </>
            )}

            {past.length > 0 && (
              <details className="poreia-fold">
                <summary>Been</summary>
                <ul className="rows">{past.map((trip) => <TripRow key={trip.id} trip={trip} today={day} onOpen={() => open(trip.id)} />)}</ul>
              </details>
            )}
          </>
        )}

        <button type="button" className="poreia-glance" onClick={() => nav.swap({ name: 'time' })}>
          <span className="label">Time off</span>
          <span>{setup ? `${hoursText(balanceOn(setup, offs, day))} on hand${offs.some((off) => off.status !== 'canceled' && off.start > day) ? ` · next ${dayText(offs.filter((off) => off.status !== 'canceled' && off.start > day).sort((a, b) => a.start.localeCompare(b.start))[0].start)}` : ''}` : 'Set up your balance'}</span>
        </button>

        {list.length > 0 && <DailyLine app="poreia" />}
      </div>
    </div>
  );
}
