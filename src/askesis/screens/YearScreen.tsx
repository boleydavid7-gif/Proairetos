import YearPage from '../../app/family/YearPage';
import type { Nav } from '../app/App';
import { useEntries, useSettings } from '../app/state';
import { askesisYear } from '../core/year';

export default function YearScreen({ nav }: { nav: Nav }) {
  const entries = useEntries() ?? [];
  const { unit } = useSettings();
  return <YearPage dates={entries.map((entry) => entry.date)} build={(year) => askesisYear(entries, year, unit)} onBack={nav.back} />;
}
