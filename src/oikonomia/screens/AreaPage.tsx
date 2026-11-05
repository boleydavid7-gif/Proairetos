import type { Nav } from '../app/App';
import { ArrowLeftIcon, ChevronIcon } from '../app/icons';
import Empty from '../../app/family/Empty';
import { useBills, useToday } from '../app/state';
import { PageTop } from '../app/ui';
import { formatDate, formatMoney, relativeDue, standing } from '../core/bills';
import { budgetCategories, budgetCategory, type BudgetCategory } from '../core/budget';

/** Every bill kept under one bill type, each opening its page. */
export default function AreaPage({ nav, id }: { nav: Nav; id: BudgetCategory }) {
  const bills = useBills();
  const today = useToday();
  const label = budgetCategories.find((area) => area.id === id)?.label ?? 'Other';
  const inArea = (bills ?? [])
    .filter((bill) => bill.category?.trim() && budgetCategory(bill.category) === id)
    .map((bill) => ({ bill, stand: standing(bill, today) }))
    .sort((a, b) => a.stand.date.localeCompare(b.stand.date) || a.bill.name.localeCompare(b.bill.name));

  return (
    <div className="page oiko-page">
      <PageTop>
        <button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={20} /> Back</button>
      </PageTop>
      <h1 className="title">{label}</h1>
      {inArea.length === 0 ? (
        <Empty icon={<ChevronIcon size={28} />} title="No bills here" />
      ) : (
        <section className="oiko-list oiko-list--large" aria-label={`${label} bills`}>
          {inArea.map(({ bill, stand }) => (
            <div className="oiko-area-row" key={bill.id}>
              <button type="button" className="oiko-bill-row" onClick={() => nav.go({ name: 'bill', id: bill.id })}>
                <span className="oiko-bill-row__mark" aria-hidden="true" />
                <span className="oiko-bill-row__main">
                  <span className="oiko-bill-row__name">{bill.name}</span>
                  <span className="oiko-bill-row__detail">{stand.settled ? (stand.complete ? (bill.endedOn ? 'No more dates' : 'One time · paid') : 'Paid') : relativeDue(stand.date, today)}{bill.autopay ? ' · autopay' : ''}</span>
                </span>
                <span className="oiko-bill-row__date">{formatDate(stand.date)}</span>
                <span className="oiko-bill-row__amount">{formatMoney(bill.amountCents, bill.currency)}</span>
                <ChevronIcon size={18} />
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
