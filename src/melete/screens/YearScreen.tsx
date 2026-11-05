import YearPage from '../../app/family/YearPage';
import type { MeleteNav } from '../app/App';
import { sessions, subjects } from '../app/state';
import { meleteDates, meleteYear } from '../core/year';

export default function YearScreen({ nav }: { nav: MeleteNav }) {
  const list = subjects.use();
  const all = sessions.use();
  return <YearPage className="melete-page" dates={meleteDates(all)} build={(year) => meleteYear(list, all, year)} onBack={nav.back} />;
}
