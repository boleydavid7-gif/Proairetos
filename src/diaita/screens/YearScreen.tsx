import YearPage from '../../app/family/YearPage';
import type { DiaitaNav } from '../app/App';
import { sleeps } from '../app/state';
import { diaitaYear } from '../core/year';

export default function YearScreen({ nav }: { nav: DiaitaNav }) {
  const records = sleeps.use();
  return <YearPage className="diaita-page" dates={records.map((record) => record.date)} build={(year) => diaitaYear(records, year)} onBack={nav.back} />;
}
