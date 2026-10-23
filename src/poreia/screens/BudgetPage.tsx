import { useEffect, useState } from 'react';
import { ChevronIcon } from '../../app/family/icons';
import { RollingNumber } from '../../lamplight/RollingNumber';
import { readAmount } from '../../core/money/readAmount';
import type { PoreiaNav } from '../app/App';
import { bookings, settings, spends, today, trips } from '../app/state';
import { datesText } from '../app/ui';
import { ratesInto } from '../app/world';
import { moneyText, SPEND_CATEGORIES, sortTrips } from '../core/model';
import { budgetYears, currenciesIn, yearSpending } from '../core/yearBudget';
import RouteEmpty from '../components/RouteEmpty';
import { SpendForm, SpendList } from '../components/Spending';

/** Budget: the year's travel budget beside what the year's trips cost, by trip and by kind, and the spending itself. */
export default function BudgetPage({ nav }: { nav: PoreiaNav }) {
  const prefs = settings.use();
  const list = trips.use();
  const allBookings = bookings.use();
  const allSpends = spends.use();
  const day = today();
  const thisYear = Number(day.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const budget = prefs.yearBudget;
  const currency = budget?.currency ?? prefs.currency;
  const [rates, setRates] = useState<Record<string, number>>({});
  const foreign = currenciesIn(list, allBookings, allSpends).some((code) => code !== currency);
  useEffect(() => {
    if (!foreign) return;
    let live = true;
    ratesInto(currency)
      .then((found) => live && setRates(found))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [currency, foreign]);

  const years = budgetYears(list, thisYear);
  const money = (cents: number) => moneyText({ cents, currency });
  const sums = yearSpending(list, allBookings, allSpends, year, currency, rates);
  const yearList = list.filter((trip) => trip.start?.startsWith(`${year}-`)).sort((a, b) => a.start!.localeCompare(b.start!));
  const ids = new Set(yearList.map((trip) => trip.id));
  const yearSpends = allSpends.filter((spend) => ids.has(spend.tripId)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const tripName = (id: string) => list.find((trip) => trip.id === id)?.name;
  const { now, ahead, someday, past } = sortTrips(list, day);
  const choices = [...now, ...ahead, ...someday, ...past];
  const shown = budget ? Math.max(budget.cents, sums.planned, 1) : Math.max(sums.planned, 1);

  return (
    <div className="page poreia-page">
      <div className="page-top">
        <h1 className="title">Budget</h1>
      </div>

      {years.length > 1 && (
        <div className="chip-row" role="group" aria-label="Year">
          {years.map((each) => (
            <button key={each} type="button" className="chip" aria-pressed={each === year} onClick={() => setYear(each)}>
              {each}
            </button>
          ))}
        </div>
      )}

      <section className="card poreia-money-card">
        <p className="label">Spent in {year}</p>
        <p className="poreia-money-card__total">
          <RollingNumber key={currency} value={sums.spent} format={(cents) => money(Math.round(cents))} />
        </p>
        {budget && <p className="muted">of {money(budget.cents)}</p>}
        {sums.planned > 0 && (
          <div className="poreia-budget-bar" aria-hidden="true">
            <span className="poreia-budget-bar__spent" style={{ width: `${Math.min(100, (sums.spent / shown) * 100)}%` }} />
            <span className="poreia-budget-bar__planned" style={{ width: `${Math.min(100, ((sums.planned - sums.spent) / shown) * 100)}%` }} />
          </div>
        )}
        <dl className="detail-list">
          {sums.planned > sums.spent && (
            <>
              <dt>Still to come</dt>
              <dd>{money(sums.planned - sums.spent)}</dd>
            </>
          )}
          {budget && (
            <>
              <dt>{sums.planned <= budget.cents ? 'Left' : 'Over'}</dt>
              <dd>{money(Math.abs(budget.cents - sums.planned))}</dd>
            </>
          )}
        </dl>
        {sums.unconverted.length > 0 && <p className="fine">Not converted: {sums.unconverted.map((each) => moneyText(each)).join(', ')}</p>}
      </section>

      <section className="card">
        <YearBudgetField />
      </section>

      {yearList.length ? (
        <>
          <p className="ll-section-label">Trips</p>
          <ul className="rows">
            {yearList.map((trip) => {
              const each = sums.trips.find((one) => one.id === trip.id);
              return (
                <li key={trip.id}>
                  <button type="button" className="row" onClick={() => nav.go({ name: 'trip', id: trip.id, view: 'money' })}>
                    <span className="row__text">
                      <span>{trip.name}</span>
                      <span className="row__detail">{datesText(trip.start, trip.end)}</span>
                    </span>
                    <span className="poreia-spend__amount">
                      {money(each?.cost ?? 0)}
                      {each?.budget !== undefined && <span className="muted"> of {money(each.budget)}</span>}
                    </span>
                    <ChevronIcon size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <RouteEmpty glyph="wallet" title={`No trips in ${year}`} line="Trips with dates in this year show here.">
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'trip-form' })}>
            Add a trip
          </button>
        </RouteEmpty>
      )}

      {sums.byCategory.size > 0 && (
        <section className="card">
          <h2 className="card__title">By kind</h2>
          <dl className="detail-list">
            {SPEND_CATEGORIES.filter((each) => sums.byCategory.get(each.id)).map((each) => (
              <span key={each.id} style={{ display: 'contents' }}>
                <dt>{each.label}</dt>
                <dd>{money(sums.byCategory.get(each.id)!)}</dd>
              </span>
            ))}
          </dl>
        </section>
      )}

      {choices.length > 0 && <SpendForm choices={choices} />}

      {yearSpends.length > 0 && (
        <>
          <p className="ll-section-label">Spending</p>
          <SpendList list={yearSpends} tripName={tripName} />
        </>
      )}
    </div>
  );
}

/** The year's travel budget, in Poreia's currency when first set. */
function YearBudgetField() {
  const current = settings.use();
  const kept = current.yearBudget;
  const currency = kept?.currency ?? current.currency;
  const [text, setText] = useState(kept ? String(kept.cents / 100) : '');
  return (
    <label className="field">
      <span className="field__label">Yearly travel budget ({currency})</span>
      <input
        className="input"
        inputMode="decimal"
        value={text}
        placeholder="0"
        onChange={(event) => {
          setText(event.target.value);
          const cents = readAmount(event.target.value);
          if (cents === undefined) return;
          settings.save({ ...settings.load(), yearBudget: cents ? { cents, currency } : undefined });
        }}
      />
    </label>
  );
}
