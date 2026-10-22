import { ChevronIcon, PlusIcon } from '../../app/family/icons';
import { addDays, parseLocalDate } from '../../core/scheduling/dates';
import type { PoreiaNav } from '../app/App';
import { settings, timeOff, today, trips } from '../app/state';
import { moneyText } from '../core/model';
import { YearBudgetLine } from '../components/References';
import { datesText } from '../app/ui';
import { accrualDates, balanceOn, daysOff, daysText, hoursText, STATUS_LABEL, type TimeOff } from '../core/timeOff';
import RouteEmpty from '../components/RouteEmpty';

/** Time off: what is on hand, what is ahead and where each request stands, and the year at a glance. */
export default function TimeOffPage({ nav }: { nav: PoreiaNav }) {
  const setup = settings.use().timeOff;
  const offs = timeOff.use();
  const day = today();
  const year = Number(day.slice(0, 4));
  const yearEnd = `${year}-12-31`;
  const live = offs.filter((off) => off.status !== 'canceled');
  const ahead = live.filter((off) => off.end >= day).sort((a, b) => a.start.localeCompare(b.start));
  const taken = live.filter((off) => off.end < day).sort((a, b) => b.start.localeCompare(a.start));
  const canceled = offs.filter((off) => off.status === 'canceled');
  const nextAccrual = setup ? accrualDates(setup, day, addDays(day, 400))[0] : undefined;
  const row = (off: TimeOff) => (
    <li key={off.id}>
      <button type="button" className="row" onClick={() => nav.go({ name: 'time-off', id: off.id })}>
        <span className="row__text">
          <span>{off.title}</span>
          <span className="row__detail">
            {datesText(off.start, off.end)} · {hoursText(off.hours)}
          </span>
        </span>
        <span className={`poreia-status poreia-status--${off.status}`}>{STATUS_LABEL[off.status]}</span>
        <ChevronIcon size={18} />
      </button>
    </li>
  );

  return (
    <div className="page poreia-page">
      <div className="page-top">
        <h1 className="title">Time off</h1>
      </div>

      {setup ? (
        <section className="card poreia-balance">
          <p className="label">On hand today</p>
          <p className="poreia-balance__hours">{hoursText(balanceOn(setup, offs, day))}</p>
          {setup.dayHours > 0 && <p className="muted">{daysText(balanceOn(setup, offs, day), setup.dayHours)} of {setup.dayHours} h</p>}
          <dl className="detail-list">
            <dt>End of {year}</dt>
            <dd>
              {hoursText(balanceOn(setup, offs, yearEnd))}
              {live.some((off) => off.status === 'planned' && off.start <= yearEnd && off.start > day) ? `, ${hoursText(balanceOn(setup, offs, yearEnd, true))} with what’s planned` : ''}
            </dd>
            {nextAccrual && (
              <>
                <dt>Next added</dt>
                <dd>
                  {hoursText(setup.accrual)} on {parseLocalDate(nextAccrual).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </dd>
              </>
            )}
            {setup.cap !== undefined && (
              <>
                <dt>Holds up to</dt>
                <dd>{hoursText(setup.cap)}</dd>
              </>
            )}
          </dl>
          <button type="button" className="text-link" onClick={() => nav.go({ name: 'time-setup' })}>
            Change balance
          </button>
        </section>
      ) : (
        <RouteEmpty glyph="clock" title="Your time off" line="Give your balance and how it grows, and every trip shows what it leaves.">
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'time-setup' })}>
            Set up your balance
          </button>
        </RouteEmpty>
      )}

      <div className="section-head">
        <h2>Ahead</h2>
        <button type="button" className="text-link" onClick={() => nav.go({ name: 'time-off' })}>
          <PlusIcon size={16} /> Add time off
        </button>
      </div>
      {ahead.length ? <ul className="rows">{ahead.map(row)}</ul> : <p className="muted poreia-quiet">Nothing planned.</p>}

      <YearView year={year} offs={offs} />
      <TripsThisYear year={year} offs={offs} nav={nav} />

      {taken.length > 0 && (
        <details className="poreia-fold">
          <summary>Taken</summary>
          <ul className="rows">{taken.map(row)}</ul>
        </details>
      )}
      {canceled.length > 0 && (
        <details className="poreia-fold">
          <summary>Canceled</summary>
          <ul className="rows">{canceled.map(row)}</ul>
        </details>
      )}
      <p className="fine">Approved time off takes those days’ work shifts off your schedule in Proairetos; canceling it puts them back.</p>
    </div>
  );
}

/** Twelve small months with time off marked by where it stands. */
function YearView({ year, offs }: { year: number; offs: readonly TimeOff[] }) {
  const marks = daysOff(offs, year);
  if (!marks.size) return null;
  return (
    <section className="card poreia-year">
      <h2 className="card__title">{year}</h2>
      <div className="poreia-year__months">
        {Array.from({ length: 12 }, (_, month) => {
          const first = new Date(year, month, 1);
          const days = new Date(year, month + 1, 0).getDate();
          return (
            <div key={month} className="poreia-year__month">
              <span className="poreia-year__name">{first.toLocaleDateString(undefined, { month: 'short' })}</span>
              <div className="poreia-year__grid" style={{ ['--lead' as string]: first.getDay() }}>
                {Array.from({ length: days }, (_, index) => {
                  const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
                  const status = marks.get(date);
                  return <span key={date} className={status ? `poreia-year__day poreia-year__day--${status}` : 'poreia-year__day'} title={status ? `${date}: ${STATUS_LABEL[status]}` : undefined} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="poreia-year__key">
        <span className="poreia-year__day poreia-year__day--approved" /> Approved <span className="poreia-year__day poreia-year__day--requested" /> Requested <span className="poreia-year__day poreia-year__day--planned" /> Planned
      </p>
    </section>
  );
}

/** The year's trips side by side: the time off each takes and its budget, with the year's travel budget beside them. */
function TripsThisYear({ year, offs, nav }: { year: number; offs: readonly TimeOff[]; nav: PoreiaNav }) {
  const list = trips
    .use()
    .filter((trip) => trip.start && Number(trip.start.slice(0, 4)) === year)
    .sort((a, b) => a.start!.localeCompare(b.start!));
  if (!list.length) return null;
  return (
    <section className="card">
      <h2 className="card__title">Trips in {year}</h2>
      <YearBudgetLine year={year} label="Travel budget" />
      <ul className="rows">
        {list.map((trip) => {
          const off = offs.find((each) => each.tripId === trip.id && each.status !== 'canceled');
          return (
            <li key={trip.id}>
              <button type="button" className="row" onClick={() => nav.go({ name: 'trip', id: trip.id })}>
                <span className="row__text">
                  <span>{trip.name}</span>
                  <span className="row__detail">
                    {[datesText(trip.start, trip.end), off ? `${hoursText(off.hours)} off, ${STATUS_LABEL[off.status].toLowerCase()}` : 'No time off planned', trip.budget ? `${moneyText(trip.budget)} budget` : undefined].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <ChevronIcon size={18} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
