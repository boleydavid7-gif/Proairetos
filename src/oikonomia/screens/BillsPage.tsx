import type { Nav } from '../app/App';
import { ChevronIcon, PlusIcon } from '../app/icons';
import { formatDate, formatMoney, relativeDue, standing, type Bill } from '../core/bills';
import SwipeRow from '../app/SwipeRow';
import { usePayBill } from '../app/payBill';
import { useBills, useToday } from '../app/state';
import { PageTop } from '../app/ui';

export default function BillsPage({ nav }: { nav: Nav }) {
  const bills = useBills();
  const today = useToday();
  const { pay, toast } = usePayBill();
  const stands = new Map((bills ?? []).map((bill) => [bill.id, standing(bill, today)]));
  const byDate = (a: Bill, b: Bill) => (stands.get(a.id)?.date ?? '').localeCompare(stands.get(b.id)?.date ?? '');
  const ordered = (bills ?? []).filter((bill) => !stands.get(bill.id)?.settled).sort(byDate);
  // Paid bills step out of the list until their next date comes round.
  const settled = (bills ?? []).filter((bill) => stands.get(bill.id)?.settled).sort(byDate);

  return (
    <div className="page oiko-page">
      <PageTop>
        <div>
          <h1 className="title">Bills</h1>
        </div>
        <button type="button" className="round-button" aria-label="Add a bill" onClick={() => nav.swap({ name: 'capture' })}><PlusIcon size={22} /></button>
      </PageTop>

      {!bills ? (
        <div className="skeleton-stack" role="status" aria-label="Gathering what you keep here"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
      ) : ordered.length === 0 && settled.length === 0 ? (
        <section className="card oiko-empty">
          <h2 className="card__title">Nothing here yet.</h2>
          <button type="button" className="button-main" onClick={() => nav.swap({ name: 'capture' })}>Add a bill</button>
        </section>
      ) : (
        <>
          {ordered.length === 0 ? (
            <p className="muted">Everything is paid for now.</p>
          ) : (
            <section className="oiko-list oiko-list--large" aria-label="All bills">
              {ordered.map((bill) => {
                const stand = stands.get(bill.id)!;
                return (
                  <SwipeRow key={bill.id} label="Paid" onSwipe={() => void pay(bill, stand.date)}>
                    <button type="button" className="oiko-bill-row" onClick={() => nav.go({ name: 'bill', id: bill.id })}>
                      <span className="oiko-bill-row__mark" aria-hidden="true" />
                      <span className="oiko-bill-row__main">
                        <span className="oiko-bill-row__name">{bill.name}</span>
                        <span className="oiko-bill-row__detail">{relativeDue(stand.date, today)}</span>
                      </span>
                      <span className="oiko-bill-row__date">{formatDate(stand.date)}</span>
                      <span className="oiko-bill-row__amount">{formatMoney(bill.amountCents, bill.currency)}</span>
                      <ChevronIcon size={18} />
                    </button>
                  </SwipeRow>
                );
              })}
            </section>
          )}
          {settled.length > 0 && (
            <details className="oiko-settled">
              <summary>Paid, back when due ({settled.length})</summary>
              <section className="oiko-list" aria-label="Paid bills">
                {settled.map((bill) => {
                  const stand = stands.get(bill.id)!;
                  return (
                    <button type="button" className="oiko-bill-row" key={bill.id} onClick={() => nav.go({ name: 'bill', id: bill.id })}>
                      <span className="oiko-bill-row__mark" aria-hidden="true" />
                      <span className="oiko-bill-row__main">
                        <span className="oiko-bill-row__name">{bill.name}</span>
                        <span className="oiko-bill-row__detail">
                          {stand.complete ? 'One time · paid' : stand.returnsOn ? `Back ${formatDate(stand.returnsOn)}` : 'Paid'}
                        </span>
                      </span>
                      <span className="oiko-bill-row__date">{formatDate(stand.date)}</span>
                      <span className="oiko-bill-row__amount">{formatMoney(bill.amountCents, bill.currency)}</span>
                      <ChevronIcon size={18} />
                    </button>
                  );
                })}
              </section>
            </details>
          )}
        </>
      )}
      {toast}
    </div>
  );
}
