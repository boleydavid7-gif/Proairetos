import YearPage from '../../app/family/YearPage';
import type { KtemaNav } from '../app/App';
import { things, upkeeps } from '../app/state';
import { ktemaDates, ktemaYear } from '../core/year';

export default function YearScreen({ nav }: { nav: KtemaNav }) {
  const all = things.use();
  const kept = upkeeps.use();
  return <YearPage className="ktema-page" dates={ktemaDates(all, kept)} build={(year) => ktemaYear(all, kept, year)} onBack={nav.back} />;
}
