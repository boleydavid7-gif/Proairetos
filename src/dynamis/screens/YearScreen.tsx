import YearPage from '../../app/family/YearPage';
import type { DynamisNav } from '../app/App';
import { mobility, workouts } from '../app/state';
import { dynamisYear } from '../core/year';

export default function YearScreen({ nav }: { nav: DynamisNav }) {
  const sessions = workouts.use();
  const routines = mobility.use();
  return <YearPage className="dynamis-page" dates={[...sessions.map((workout) => workout.date), ...routines.map((log) => log.date)]} build={(year) => dynamisYear(sessions, routines, year)} onBack={nav.back} />;
}
