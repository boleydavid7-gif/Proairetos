import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { ChevronIcon } from '../../app/family/icons';
import type { DiaitaNav } from '../app/App';
import { usePlan } from '../app/state';
import { span, weekdayText } from '../app/ui';
import { DAY_NAMES, dayKind, entriesOn } from '../core/rhythm';

export default function WeekPage({ nav }: { nav: DiaitaNav }) {
  const now = new Date();
  const start = toLocalDate(now);
  const { entries, blocks, dayAt } = usePlan(start, addDays(start, 7));
  const today = dayAt(now);
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));

  return (
    <div className="page diaita-page">
      <div className="page-top"><h1 className="title">Week</h1></div>
      <ul className="diaita-week">
        {days.map((date) => {
          const day = entriesOn(date, entries, dayAt);
          const kind = dayKind(date, blocks);
          const pick = (kind: string) => day.find((entry) => entry.kind === kind);
          const work = day.filter((entry) => entry.kind === 'work');
          const sleep = day.filter((entry) => entry.kind === 'sleep').pop();
          const nap = pick('nap');
          const caffeine = day.filter((entry) => entry.kind === 'caffeine').pop();
          return (
            <li key={date}>
              <button type="button" className={`card card--link diaita-day diaita-day--${kind}`} onClick={() => nav.go({ name: 'day', date })}>
                <span className="diaita-day__head">
                  <strong>{weekdayText(date, today)}</strong>
                  <span className="diaita-day__kind">{DAY_NAMES[kind]}</span>
                  <ChevronIcon size={17} />
                </span>
                <span className="diaita-day__lines">
                  {work.map((entry) => <span key={entry.key}>{entry.title} {span(entry)}</span>)}
                  {nap && <span>Nap {span(nap)}</span>}
                  {caffeine && <span>Last caffeine {span(caffeine)}</span>}
                  {sleep && <span>{sleep.title} {span(sleep)}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
