import YearPage from '../../app/family/YearPage';
import type { PhiliaNav } from '../app/App';
import { people } from '../app/state';
import { philiaDates, philiaYear } from '../core/year';

export default function YearScreen({ nav }: { nav: PhiliaNav }) {
  const all = people.use();
  return <YearPage className="philia-page" dates={philiaDates(all)} build={(year) => philiaYear(all, year)} onBack={nav.back} />;
}
