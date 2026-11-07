import YearPage from '../../app/family/YearPage';
import type { TherapeiaNav } from '../app/App';
import { appointments, readings } from '../app/state';
import { therapeiaYear } from '../core/year';

export default function YearScreen({ nav }: { nav: TherapeiaNav }) {
  const visits = appointments.use();
  const kept = readings.use();
  return <YearPage className="therapeia-page" dates={[...visits.map((visit) => visit.at), ...kept.map((reading) => reading.at)]} build={(year) => therapeiaYear(visits, kept, year)} onBack={nav.back} />;
}
