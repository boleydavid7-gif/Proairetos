import YearPage from '../../app/family/YearPage';
import type { ErgonNav } from '../app/App';
import { useChores } from '../app/state';
import { ergonDates, ergonYear } from '../core/year';

export default function YearScreen({ nav }: { nav: ErgonNav }) {
  const chores = useChores();
  return <YearPage className="ergon-page" dates={ergonDates(chores)} build={(year) => ergonYear(chores, year)} onBack={nav.back} />;
}
