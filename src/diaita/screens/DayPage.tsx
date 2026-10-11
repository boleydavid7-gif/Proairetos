import { BackIcon } from '../../app/family/icons';
import { addDays } from '../../core/scheduling/dates';
import type { DiaitaNav } from '../app/App';
import { usePlan } from '../app/state';
import { Timeline, weekdayText } from '../app/ui';
import { DAY_NAMES, dayKind, entriesOn } from '../core/rhythm';

export default function DayPage({ nav, date }: { nav: DiaitaNav; date: string }) {
  const { entries, blocks, dayAt } = usePlan(addDays(date, -1), addDays(date, 1));
  const today = dayAt(new Date());
  return (
    <div className="page diaita-page">
      <div className="page-top">
        <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Week</button>
      </div>
      <h1 className="title">{weekdayText(date, today)}</h1>
      <p className="lead">{DAY_NAMES[dayKind(date, blocks)]}</p>
      <Timeline entries={entriesOn(date, entries, dayAt)} now={date === today ? new Date() : undefined} />
      <p className="hint">Tap a line for its source.</p>
    </div>
  );
}
