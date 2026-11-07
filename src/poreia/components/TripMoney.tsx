import { RollingNumber } from '../../lamplight/RollingNumber';
import { useEffect, useState } from 'react';
import { isAdded } from '../../app/family/added';
import { offerUndo, say } from '../../app/family/shell';
import { bookings, settings, spends } from '../app/state';
import { moneyText, SPEND_CATEGORIES, tripTotals, type Spend, type Trip } from '../core/model';
import { balances, settleUp } from '../core/split';
import { Balances, peopleOf } from './Together';
import { SavingCard } from './TripGoals';
import { YearBudgetLine } from './References';
import { SpendForm, SpendList } from './Spending';

/** What the trip costs: bookings and spending, in the person's currency, beside the budget if there is one. */
export default function TripMoney({ trip }: { trip: Trip }) {
  const prefs = settings.use();
  const currency = trip.budget?.currency ?? prefs.currency;
  const theirBookings = bookings.use().filter((each) => each.tripId === trip.id);
  const theirSpends = spends.use().filter((each) => each.tripId === trip.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const [showing, setShowing] = useState(false);
  const foreign = [...theirBookings.map((b) => b.cost?.currency), ...theirSpends.map((s) => s.amount.currency)].some((code) => code && code !== currency);

  const totals = tripTotals(theirBookings, theirSpends, currency, {});
  const people = peopleOf(trip);
  const together = people.length > 1;
  const shared = together
    ? balances(
        [
          ...theirBookings.filter((each) => each.cost && each.paidBy).map((each) => ({ amount: each.cost!, paidBy: each.paidBy })),
          ...theirSpends.map((each) => ({ amount: each.amount, paidBy: each.paidBy, for: each.for })),
        ],
        people,
        currency,
        {},
      )
    : undefined;

  return (
    <>
      <section className="card poreia-money-card">
        <p className="label">So far</p>
        <p className="poreia-money-card__total"><RollingNumber key={currency} value={totals.total} format={(cents) => moneyText({ cents: Math.round(cents), currency })} /></p>
        {trip.budget && (
          <p className="muted">
            Budget {moneyText(trip.budget)} · {totals.total <= trip.budget.cents ? `${moneyText({ cents: trip.budget.cents - totals.total, currency })} left` : `${moneyText({ cents: totals.total - trip.budget.cents, currency })} over`}
          </p>
        )}
        {trip.start && <YearBudgetLine year={Number(trip.start.slice(0, 4))} />}
        <dl className="detail-list">
          <dt>Booked</dt>
          <dd>{moneyText({ cents: totals.booked, currency })}</dd>
          <dt>Spent there</dt>
          <dd>{moneyText({ cents: totals.spent, currency })}</dd>
          {SPEND_CATEGORIES.filter((each) => totals.byCategory.get(each.id)).map((each) => (
            <span key={each.id} style={{ display: 'contents' }}>
              <dt>{each.label}</dt>
              <dd>{moneyText({ cents: totals.byCategory.get(each.id)!, currency })}</dd>
            </span>
          ))}
        </dl>
        {totals.unconverted.length > 0 && <p className="fine">Amounts in another currency are kept separately until you convert them yourself: {totals.unconverted.map((money) => moneyText(money)).join(', ')}.</p>}
      </section>

      {foreign && <button type="button" className="button-quiet" onClick={() => setShowing((open) => !open)}>{showing ? 'Hide currency note' : 'About currencies'}</button>}

      <SavingCard trip={trip} />

      {shared && <Balances list={shared.balances} transfers={settleUp(shared.balances)} currency={currency} leftOut={shared.leftOut} />}

      {theirSpends.length > 0 && (
        <>
          <p className="ll-section-label">Spending</p>
          <SpendList list={theirSpends} together={together} />
          <ToOikonomia trip={trip} spends={theirSpends} />
        </>
      )}

      <SpendForm trip={trip} />
    </>
  );
}

/** With Oikonomia added: the trip's spending into its Spent, by month and in its currency, when asked. */
function ToOikonomia({ trip, spends: list }: { trip: Trip; spends: Spend[] }) {
  const [apps, setApps] = useState<typeof import('../app/connections')>();
  const [busy, setBusy] = useState(false);
  const [, redraw] = useState(0);
  const added = isAdded('oikonomia');
  useEffect(() => {
    if (added) void import('../app/connections').then(setApps);
  }, [added]);
  if (!apps) return null;
  const waiting = apps.notInOikonomia(list);
  if (!waiting.length) return <p className="fine">In Oikonomia’s Spent.</p>;
  return (
    <button
      type="button"
      className="button-quiet"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { sent, undo } = await apps.sendToOikonomia(trip, waiting);
          redraw((count) => count + 1);
          if (sent) offerUndo(`${sent} added to Oikonomia’s Spent`, () => { undo(); redraw((count) => count + 1); });
          if (sent < waiting.length) say('Amounts in another currency stay here until you convert them yourself.');
        } catch {
          say('Couldn’t add the spending to Oikonomia. Try again.');
        }
        setBusy(false);
      }}
    >
      Add to Oikonomia’s Spent ({waiting.length})
    </button>
  );
}
