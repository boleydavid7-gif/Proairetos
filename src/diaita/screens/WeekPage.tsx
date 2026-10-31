import { addDays, parseLocalDate, toLocalDate } from '../../core/scheduling/dates';
import { ChevronIcon } from '../../app/family/icons';
import type { DiaitaNav } from '../app/App';
import { usePlan } from '../app/state';
import { span, weekdayText } from '../app/ui';
import { DAY_NAMES, dayKind, entriesOn, type Entry } from '../core/rhythm';

/** Each day's track runs from 6 AM to 10 AM the next day, so a night's sleep and a night's work sit whole on it. */
const TRACK_FROM = 6;
const TRACK_HOURS = 28;
const TRACKED: readonly Entry['kind'][] = ['work', 'nap', 'sleep'];

function DayTrack({ date, day }: { date: string; day: readonly Entry[] }) {
  const start = parseLocalDate(date);
  start.setHours(TRACK_FROM, 0, 0, 0);
  const total = TRACK_HOURS * 3_600_000;
  const at = (when: Date) => Math.max(0, Math.min(1, (when.getTime() - start.getTime()) / total));
  return (
    <span className="diaita-track" aria-hidden="true">
      {[0.25, 0.5, 0.75].map((mark) => <span key={mark} className="diaita-track__tick" style={{ left: `${mark * (24 / TRACK_HOURS) * 100}%` }} />)}
      {day.filter((entry) => TRACKED.includes(entry.kind) && entry.end).map((entry) => {
        const left = at(entry.start);
        const width = at(entry.end!) - left;
        if (width <= 0) return null;
        return <span key={entry.key} className={`diaita-track__span diaita-track__span--${entry.kind}`} style={{ left: `${left * 100}%`, width: `${width * 100}%` }} />;
      })}
    </span>
  );
}

export default function WeekPage({ nav }: { nav: DiaitaNav }) {
  const now = new Date();
  const start = toLocalDate(now);
  const { entries, blocks, dayAt } = usePlan(start, addDays(start, 7));
  const today = dayAt(now);
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));

  return (
    <div className="page diaita-page">
      <div className="page-top"><h1 className="title">Week</h1></div>
      <ul className="rows diaita-week-list">
        {days.map((date) => {
          const day = entriesOn(date, entries, dayAt);
          const kind = dayKind(date, blocks);
          const work = day.filter((entry) => entry.kind === 'work');
          const sleep = day.filter((entry) => entry.kind === 'sleep').pop();
          const nap = day.find((entry) => entry.kind === 'nap');
          const caffeine = day.filter((entry) => entry.kind === 'caffeine').pop();
          const lines = [
            ...work.map((entry) => `${entry.title} ${span(entry)}`),
            ...(nap ? [`Nap ${span(nap)}`] : []),
            ...(sleep ? [`Sleep ${span(sleep)}`] : []),
            ...(caffeine ? [`Last caffeine ${span(caffeine)}`] : []),
          ];
          return (
            <li key={date}>
              <button type="button" className={`diaita-week-day diaita-day--${kind}`} onClick={() => nav.go({ name: 'day', date })}>
                <span className="diaita-week-day__head">
                  <strong>{weekdayText(date, today)}</strong>
                  {blocks.length > 0 && <span className="diaita-day__kind">{DAY_NAMES[kind]}</span>}
                  <ChevronIcon size={18} />
                </span>
                <DayTrack date={date} day={day} />
                <span className="diaita-week-day__lines">{lines.join(' · ')}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="diaita-track-key" aria-hidden="true">
        {blocks.length > 0 && <span><i className="diaita-track__span--work" />Work</span>}
        <span><i className="diaita-track__span--sleep" />Sleep</span>
        <span><i className="diaita-track__span--nap" />Nap</span>
        <span className="diaita-track-key__hours">6 AM to 10 AM</span>
      </p>
    </div>
  );
}
