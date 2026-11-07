import type { Nav } from '../app/App';
import { BillsIcon, CalendarIcon, ChevronIcon, PlusIcon, WalletIcon } from '../app/icons';
import { PageTop } from '../app/ui';
import BudgetCard from './BudgetCard';

/** The money side: the monthly plan, what was spent, savings envelopes and pay. */
export default function PlanPage({ nav }: { nav: Nav }) {
  const rows = [
    { icon: <WalletIcon size={22} />, title: 'Monthly plan', route: 'budget' as const },
    { icon: <BillsIcon size={22} />, title: 'Expenses', route: 'spent' as const },
    { icon: <WalletIcon size={22} />, title: 'Savings envelopes', route: 'envelopes' as const },
    { icon: <CalendarIcon size={22} />, title: 'Pay', route: 'pay' as const },
  ];
  return (
    <div className="page oiko-page">
      <PageTop>
        <div>
          <h1 className="title">Plan</h1>
        </div>
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'expense' })}><PlusIcon size={18} />Add</button>
      </PageTop>
      <BudgetCard nav={nav} />
      <ul className="rows">
        {rows.map((row) => (
          <li key={row.title}>
            <button type="button" className="row" onClick={() => nav.go({ name: row.route })}>
              <span className="row__icon">{row.icon}</span>
              <span className="row__text"><span>{row.title}</span></span>
              <ChevronIcon size={18} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
