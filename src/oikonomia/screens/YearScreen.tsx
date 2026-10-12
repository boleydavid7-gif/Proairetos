import YearPage from '../../app/family/YearPage';
import type { Nav } from '../app/App';
import { useBills, useSettings, useStoreVersion } from '../app/state';
import { monthsWithSpent, spentIn } from '../data/spent';
import { oikonomiaYear } from '../core/year';

export default function YearScreen({ nav }: { nav: Nav }) {
  useStoreVersion();
  const bills = useBills() ?? [];
  const { currency } = useSettings();
  const spent = monthsWithSpent().flatMap((month) => spentIn(month));
  const dates = [...bills.flatMap((bill) => bill.payments.map((payment) => payment.date)), ...spent.map((line) => line.date)];
  return <YearPage className="oiko-page" dates={dates} build={(year) => oikonomiaYear(bills, spent, currency, year)} onBack={nav.back} />;
}
