import { BackIcon } from '../../app/family/icons';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import type { DiaitaNav } from '../app/App';
import { settings, sunPlace, usePlan } from '../app/state';
import { notifications } from '../../app/notify/notifications';
import { AdjustTimes, Timeline, weekdayText } from '../app/ui';
import { baseSleeps, DAY_NAMES, dayKind, entriesOn } from '../core/rhythm';

export default function DayPage({ nav, date }: { nav: DiaitaNav; date: string }) {
  const { entries, blocks, dayAt } = usePlan(addDays(date, -1), addDays(date, 1));
  const today = dayAt(new Date());
  const current = settings.use();
  const shown = entriesOn(date, entries, dayAt);
  // The day's main sleep: this day's own two boxes move it and its wake time.
  const sleep = shown.find((entry) => entry.kind === 'sleep' && entry.title === 'Sleep') ?? shown.find((entry) => entry.kind === 'sleep');
  const key = sleep ? (sleep.day ?? toLocalDate(sleep.start)) : undefined;
  const own = key ? current.dayAdjust?.[key] : undefined;
  const base = key ? baseSleeps(addDays(date, -2), addDays(date, 2), blocks, { ...current, place: sunPlace() }).find((each) => (each.day ?? toLocalDate(each.start)) === key) : undefined;
  const set = (next: { sleep: number; wake: number }) => {
    if (!key) return;
    settings.save({ ...settings.load(), dayAdjust: { ...current.dayAdjust, [key]: next } });
    notifications.refreshSoon();
  };
  return (
    <div className="page diaita-page">
      <div className="page-top">
        <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Week</button>
      </div>
      <h1 className="title">{weekdayText(date, today)}</h1>
      <p className="lead">{DAY_NAMES[dayKind(date, blocks)]}</p>
      {key && base && <AdjustTimes base={base} shift={own ?? { sleep: current.sleepShift ?? 0, wake: current.wakeShift ?? 0 }} onChange={set} />}
      <Timeline entries={shown} now={date === today ? new Date() : undefined} />
    </div>
  );
}
