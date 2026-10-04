import type { Nav } from '../app/App';
import { ChevronIcon, RepeatIcon } from '../app/icons';
import { nextBills, formatDate, formatMoney, relativeDue, monthBounds, occurrencesBetween, type Bill } from '../core/bills';
import { financeLineFor } from '../core/lines';
import { useBills, useToday } from '../app/state';
import { Brand, greeting, Hero } from '../app/ui';

function billRow(bill: Bill, date: string, nav: Nav, today: string) {
  return (
    <button type="button" className="oiko-bill-row" onClick={() => nav.go({ name: 'bill', id: bill.id })}>
      <span className="oiko-bill-row__mark" aria-hidden="true" />
      <span className="oiko-bill-row__main">
        <span className="oiko-bill-row__name">{bill.name}</span>
        <span className="oiko-bill-row__detail">{relativeDue(date, today)}</span>
      </span>
      <span className="oiko-bill-row__date">{formatDate(date)}</span>
      <span className="oiko-bill-row__amount">{formatMoney(bill.amountCents, bill.currency)}</span>
      <ChevronIcon size={18} />
    </button>
  );
}

export default function HomePage({ nav }: { nav: Nav }) {
  const bills = useBills();
  const today = useToday();
  const line = financeLineFor(today);
  const all = bills ?? [];
  const upcoming = nextBills(all, today, 8);
  const next = upcoming[0];
  const month = new Date();
  const bounds = monthBounds(month);
  const thisMonth = all
    .flatMap((bill) => occurrencesBetween(bill, bounds.from, bounds.until))
    .sort((a, b) => a.date.localeCompare(b.date) || a.bill.name.localeCompare(b.bill.name));

  return (
    <div className="home oiko-home">
      <Hero>
        <Brand light />
        <div className="home__words">
          <p className="home__greeting">{greeting()}</p>
          <h1 className="home__title">“{line.text}”</h1>
          <p className="home__sub">{line.source}</p>
        </div>
      </Hero>

      <div className="page page--under-hero">
        {!bills ? (
          <section className="card"><p className="muted">Gathering what you keep here…</p></section>
        ) : all.length === 0 ? (
          <section className="card oiko-empty">
            <h2 className="card__title">What needs tending?</h2>
            <p className="muted">Nothing here yet.</p>
            <button type="button" className="button-main" onClick={() => nav.swap({ name: 'capture' })}>
              Add a bill
            </button>
          </section>
        ) : (
          <>
            {next && (
              <section className="card oiko-next-card">
                <button type="button" className="oiko-next-card__bill" onClick={() => nav.go({ name: 'bill', id: next.bill.id })}>
                  <span className="oiko-bill-emblem"><RepeatIcon size={20} /></span>
                  <span className="oiko-next-card__words">
                    <strong>{next.bill.name}</strong>
                    <span>{relativeDue(next.date, today)} · {formatDate(next.date)}</span>
                  </span>
                  <span className="oiko-next-card__amount">{formatMoney(next.bill.amountCents, next.bill.currency)}</span>
                  <ChevronIcon size={18} />
                </button>
              </section>
            )}

            <div className="oiko-section-head">
              <h2>This month</h2>
              <button type="button" className="text-link" onClick={() => nav.swap({ name: 'calendar' })}>View calendar</button>
            </div>
            <section className="oiko-list" aria-label="Bills this month">
              {thisMonth.slice(0, 8).map((occurrence) => (
                <span key={occurrence.bill.id + occurrence.date}>{billRow(occurrence.bill, occurrence.date, nav, today)}</span>
              ))}
              {thisMonth.length === 0 && <p className="muted">Nothing is scheduled for this month.</p>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
