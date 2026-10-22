import { Brand } from '../../app/family/shell';
import { DailyLine } from '../../app/family/DailyLine';
import { AppMark, PlusIcon } from '../../app/family/icons';
import { useNow } from '../../hydros/app/day';
import photoWide from '../../assets/images/scenes/therapeia-wide.webp';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import type { TherapeiaNav } from '../app/App';
import { appointments, useAnchors, useMedicines } from '../app/state';
import { at, DoseRow, dayWord, takeOneNow } from '../app/ui';
import { dosesOn, isCurrent, lastTaken, spacedFrom, splitAppointments } from '../core/medicines';


export default function TodayPage({ nav }: { nav: TherapeiaNav }) {
  const now = useNow();
  const all = useMedicines();
  const visits = appointments.use();
  const calendarToday = toLocalDate(now);
  const { anchors, dayAt } = useAnchors(addDays(calendarToday, -1), addDays(calendarToday, 1));
  const today = dayAt(now);
  const current = all.filter((medicine) => isCurrent(medicine, today));
  const doses = dosesOn(current, today, anchors);
  const open = doses.filter((dose) => !dose.taken);
  const next = open.find((dose) => dose.at >= now) ?? open[0];
  const asNeeded = current.filter((medicine) => medicine.asNeeded);
  const coming = splitAppointments(visits, now).coming.filter((visit) => visit.at.slice(0, 10) <= addDays(today, 14));

  return (
    <div className="home therapeia-home">
      <div className="hero hero--tall hero-shade-soft">
        <picture>
          <img className="hero__image" src={photoWide} alt="" />
        </picture>
        <div className="hero__shade" />
        <div className="hero__content">
          <Brand name="Therapeia" mark={<AppMark app="therapeia" size={30} light />} light />
          <div className="home__words">
            <h1 className="home__title">{next ? next.medicine.name : doses.length ? 'All marked' : 'Nothing set for today'}</h1>
            <p className="home__sub">{next ? `${at(next.at)}${next.medicine.dose ? ` · ${next.medicine.dose}` : ''}` : 'Medicines'}</p>
          </div>
        </div>
      </div>

      <div className="page page--under-hero">
        {all.length === 0 ? (
          <section className="card first-run">
            <h2 className="card__title">No medicines yet</h2>
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'medicine' })}><PlusIcon size={18} />Add a medicine</button>
          </section>
        ) : (
          <>
            <div className="section-head">
              <h2>Today</h2>
              <button type="button" className="text-link" onClick={() => nav.go({ name: 'medicine' })}>Add</button>
            </div>
            {doses.length ? (
              <ul className="chore-list">
                {doses.map((dose) => <DoseRow key={`${dose.medicine.id}${dose.slot}`} dose={dose} onOpen={() => nav.go({ name: 'medicine', id: dose.medicine.id })} />)}
              </ul>
            ) : (
              <p className="muted">No set doses today.</p>
            )}
          </>
        )}

        {asNeeded.length > 0 && (
          <>
            <div className="section-head"><h2>As needed</h2></div>
            <ul className="chore-list">
              {asNeeded.map((medicine) => {
                const last = lastTaken(medicine);
                const from = spacedFrom(medicine);
                return (
                  <li key={medicine.id} className="chore">
                    <button type="button" className="chore__open" onClick={() => nav.go({ name: 'medicine', id: medicine.id })}>
                      <span>{medicine.name}</span>
                      <small>{[last ? `Last ${dayWord(last, calendarToday).toLowerCase() === 'today' ? at(last) : `${dayWord(last, calendarToday)} ${at(last)}`}` : 'Not taken yet', from && from > now ? `Spacing until ${at(from)}` : undefined].filter(Boolean).join(' · ')}</small>
                    </button>
                    <button type="button" className="button-quiet dose__now" onClick={() => takeOneNow(medicine)}>Taken now</button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {coming.length > 0 && (
          <>
            <div className="section-head"><h2>Visits</h2></div>
            <ul className="chore-list">
              {coming.map((visit) => {
                const when = new Date(visit.at);
                return (
                  <li key={visit.id} className="chore">
                    <button type="button" className="chore__open" onClick={() => nav.go({ name: 'visit', id: visit.id })}>
                      <span>{visit.with}</span>
                      <small>{[visit.where, (() => { const open = visit.questions.filter((each) => !each.asked).length; return open ? (open === 1 ? '1 question' : `${open} questions`) : undefined; })()].filter(Boolean).join(' · ')}</small>
                    </button>
                    <span className="chore__when">{dayWord(when, calendarToday)} {at(when)}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {all.length > 0 && <DailyLine app="therapeia" />}
      </div>
    </div>
  );
}
