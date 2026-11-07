import { Placeholder } from '../../lamplight/Placeholder';
import type { Nav } from '../app/App';
import { ChevronIcon, PlusIcon, BillsIcon } from '../app/icons';
import { formatDate, formatMoney, relativeDue, standing, type Bill } from '../core/bills';
import SwipeRow from '../app/SwipeRow';
import { payBill } from '../app/payBill';
import { useBills, useToday } from '../app/state';
import { PageTop } from '../app/ui';
import Empty from '../../app/family/Empty';
import { useAppPermissions } from '../../app/household/household';

export default function BillsPage({ nav }: { nav: Nav }) {
  const bills = useBills();
  const can = useAppPermissions('oikonomia');
  const today = useToday();
  const stands = new Map((bills ?? []).map((bill) => [bill.id, standing(bill, today)]));
  const byDate = (a: Bill, b: Bill) => (stands.get(a.id)?.date ?? '').localeCompare(stands.get(b.id)?.date ?? '');
  const ordered = (bills ?? []).filter((bill) => !stands.get(bill.id)?.settled).sort(byDate);
  // Paid bills stay in the list, marked, until their next date comes around.
  const settled = (bills ?? []).filter((bill) => stands.get(bill.id)?.settled).sort(byDate);

  return (
    <div className="page oiko-page">
      <PageTop>
        <div>
          <h1 className="title">Bills</h1>
        </div>
        {can.write && <button type="button" className="button-main" onClick={() => nav.go({ name: 'capture' })}><PlusIcon size={18} />Add</button>}
      </PageTop>

      {!bills ? (
        <Placeholder label="Gathering what you keep here" count={3} />
      ) : ordered.length === 0 && settled.length === 0 ? (
        <Empty icon={<BillsIcon size={28} />} title="No bills yet" />
      ) : (
        <>
          <section className="oiko-list oiko-list--large" aria-label="All bills">
            {[...ordered, ...settled].map((bill) => {
              const stand = stands.get(bill.id)!;
              const row = (
                <button type="button" className="oiko-bill-row" onClick={() => nav.go({ name: 'bill', id: bill.id })}>
                  <span className="oiko-bill-row__mark" aria-hidden="true" />
                  <span className="oiko-bill-row__main">
                    <span className="oiko-bill-row__name">{bill.name}</span>
                    <span className="oiko-bill-row__detail">
                      {stand.settled
                        ? stand.complete ? (bill.endedOn ? 'No more dates' : 'One time · paid') : stand.returnsOn ? `Paid · back ${formatDate(stand.returnsOn)}` : 'Paid'
                        : `${relativeDue(stand.date, today)}${bill.autopay ? ' · autopay' : ''}`}
                    </span>
                  </span>
                  <span className="oiko-bill-row__date">{formatDate(stand.date)}</span>
                  <span className="oiko-bill-row__amount">{formatMoney(bill.amountCents, bill.currency)}</span>
                  <ChevronIcon size={18} />
                </button>
              );
              return stand.settled ? <div key={bill.id}>{row}</div> : (
                <SwipeRow key={bill.id} label="Paid" off={!can.write} onSwipe={() => void payBill(bill, stand.date)}>{row}</SwipeRow>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
