import YearPage from '../../app/family/YearPage';
import type { Nav } from '../app/App';
import { useRecipes } from '../app/state';
import { somaDates, somaYear } from '../core/year';

export default function YearScreen({ nav }: { nav: Nav }) {
  const recipes = useRecipes() ?? [];
  return <YearPage dates={somaDates(recipes)} build={(year) => somaYear(recipes, year)} onBack={nav.back} />;
}
