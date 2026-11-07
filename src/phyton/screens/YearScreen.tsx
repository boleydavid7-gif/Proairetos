import YearPage from '../../app/family/YearPage';
import type { PhytonNav } from '../app/App';
import { usePlants } from '../app/state';
import { phytonDates, phytonYear } from '../core/year';

export default function YearScreen({ nav }: { nav: PhytonNav }) {
  const plants = usePlants();
  return <YearPage className="phyton-page" dates={phytonDates(plants)} build={(year) => phytonYear(plants, year)} onBack={nav.back} />;
}
