import { Brand } from '../../app/family/shell';
import { AppMark, PlusIcon } from '../../app/family/icons';
import { DailyLine } from '../../app/family/DailyLine';
import photo from '../../assets/images/scenes/poreia.webp';
import photoWide from '../../assets/images/scenes/poreia-wide.webp';
import type { PoreiaNav } from '../app/App';
import { today, trips } from '../app/state';
import { NextUpCard } from './TripPage';
import LookBack from '../components/LookBack';
import { InviteCard } from '../components/Together';
import { ArrivedMails } from '../components/MailBox';
import { datesText, TripRow } from '../app/ui';
import { phaseOf, phaseText, sortTrips } from '../core/model';
import RouteEmpty from '../components/RouteEmpty';

export default function TripsPage({ nav }: { nav: PoreiaNav }) {
  const list = trips.use();
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
          {lead ? (
            // The trip under way or next is a way into it, not only its name.
            <button type="button" className="home__words poreia-home__lead" onClick={() => open(lead.id)}>
              <h1 className="home__title">{lead.name}</h1>
              <p className="home__sub">{[phaseText(phaseOf(lead, day)), datesText(lead.start, lead.end)].filter(Boolean).join(' · ')}</p>
            </button>
          ) : (
            <div className="home__words">
              <h1 className="home__title">Trips</h1>
              <p className="home__sub">Where to next?</p>
            </div>
          )}
        </div>
      </div>

      <div className="page page--under-hero">
        <InviteCard nav={nav} />
        <ArrivedMails nav={nav} />
        {list.length === 0 ? (
          <RouteEmpty glyph="plane" title="No trips yet" line="Start with a place, or just an idea.">
              <button type="button" className="button-main" onClick={() => nav.go({ name: 'trip-form' })}>
                <PlusIcon size={18} />
                Plan a trip
              </button>
              <button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'explore' })}>
                Explore places
              </button>
          </RouteEmpty>
        ) : (
          <>
            <LookBack list={list} today={day} nav={nav} />
            {lead && (leadPhase?.kind === 'now' || (leadPhase?.kind === 'ahead' && leadPhase.days <= 30)) && <NextUpCard trip={lead} nav={nav} day={day} home />}

            <div className="section-head">
              <h2>Trips</h2>
              <button type="button" className="text-link" onClick={() => nav.go({ name: 'trip-form' })}>
                Plan a trip
              </button>
            </div>
            {/* Every trip under way or ahead is listed, the one at the top too, so each can be opened and changed. */}
            {[...now, ...ahead].length > 0 ? (
              <ul className="rows">{[...now, ...ahead].map((trip) => <TripRow key={trip.id} trip={trip} today={day} onOpen={() => open(trip.id)} />)}</ul>
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

        {list.length > 0 && <DailyLine app="poreia" />}
      </div>
    </div>
  );
}
