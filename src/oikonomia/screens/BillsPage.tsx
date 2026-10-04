import type { Nav } from '../app/App';
import { ChevronIcon, PlusIcon } from '../app/icons';
import { formatDate, formatMoney, nextBills, relativeDue } from '../core/bills';
import { useBills, useToday } from '../app/state';
import { PageTop } from '../app/ui';

export default function BillsPage({ nav }: { nav: Nav }) {
  const bills = useBills();
  const today = useToday();
  const upcoming = nextBills(bills ?? [], today, 100);
  const byId = new Map(upcoming.map((item) => [item.bill.id, item]));
  const ordered = [...(bills ?? [])].sort((a, b) => (byId.get(a.id)?.date ?? a.dueDate).localeCompare(byId.get(b.id)?.date ?? b.dueDate));

  return (
    <div className="page oiko-page">
      <PageTop>
        <div>
          <h1 className="title">Bills</h1>
        </div>
        <button type="button" className="round-button" aria-label="Add a bill" onClick={() => nav.swap({ name: 'capture' })}><PlusIcon size={22} /></button>
      </PageTop>

      {!bills ? (
        <p className="muted">Gathering what you keep here…</p>
      ) : ordered.length === 0 ? (
        <section className="card oiko-empty">
          <h2 className="card__title">Nothing here yet.</h2>
          <button type="button" className="button-main" onClick={() => nav.swap({ name: 'capture' })}>Add a bill</button>
        </section>
      ) : (
        <section className="oiko-list oiko-list--large" aria-label="All bills">
          {ordered.map((bill) => {
            const occurrence = byId.get(bill.id);
            return (
              <button type="button" className="oiko-bill-row" key={bill.id} onClick={() => nav.go({ name: 'bill', id: bill.id })}>
                <span className="oiko-bill-row__mark" aria-hidden="true" />
                <span className="oiko-bill-row__main">
                  <span className="oiko-bill-row__name">{bill.name}</span>
                  <span className="oiko-bill-row__detail">{occurrence ? relativeDue(occurrence.date, today) : 'One time · complete'}</span>
                </span>
                <span className="oiko-bill-row__date">{occurrence ? formatDate(occurrence.date) : formatDate(bill.dueDate)}</span>
                <span className="oiko-bill-row__amount">{formatMoney(bill.amountCents, bill.currency)}</span>
                <ChevronIcon size={18} />
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
