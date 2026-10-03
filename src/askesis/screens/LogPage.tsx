import { useState } from 'react';
import type { Nav } from '../app/App';
import { ChevronIcon, PlusIcon } from '../app/icons';
import { useEntries, useSettings, useToday } from '../app/state';
import { Brand, dayLabel, Segmented } from '../app/ui';
import { activities, feelings, newestFirst, periodRange, totalsBetween, weeklyTotals, type Period } from '../core/log';
import { formatDistance, formatDuration, formatHours, formatPace, inUnit, paceOf } from '../core/pace';

const periods: { id: Period; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All time' },
];

const beforeName: Record<Period, string> = { week: 'Last week', month: 'Last month', year: 'Last year', all: '' };

/** What was done, as it was written down: totals, a plain bar for each week, and every entry. */
export default function LogPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const today = useToday();
  const entries = useEntries();
  const [period, setPeriod] = useState<Period>('week');
  const unit = settings.unit;
  const list = [...(entries ?? [])].sort(newestFirst);
  const range = periodRange(period, today);
  const totals = totalsBetween(list, range.from, range.to);
  const before = range.before && totalsBetween(list, range.before.from, range.before.to);
  const weeks = weeklyTotals(list, 8, today);
  const byDistance = weeks.some((week) => week.meters > 0);
  const tallest = Math.max(1, ...weeks.map((week) => (byDistance ? week.meters : week.seconds)));

  return (
    <div className="page">
      <div className="page-top">
        <Brand />
        <button type="button" className="round-button" aria-label="Log a workout" onClick={() => nav.go({ name: 'entry' })}>
          <PlusIcon size={22} />
        </button>
      </div>
      <h1 className="title">Progress</h1>
      <Segmented label="Period" value={period} options={periods} onChange={setPeriod} small />

      <div className="tiles">
        <div className="tile">
          <span className="tile__label">Total distance</span>
          <span className="tile__value">{formatDistance(totals.meters, unit)}</span>
        </div>
        <div className="tile">
          <span className="tile__label">Total time</span>
          <span className="tile__value">{formatHours(totals.seconds)}</span>
        </div>
        <div className="tile">
          <span className="tile__label">Workouts</span>
          <span className="tile__value">{totals.count}</span>
        </div>
        <div className="tile">
          <span className="tile__label">Longest</span>
          <span className="tile__value">
            {totals.longestMeters ? formatDistance(totals.longestMeters, unit) : totals.longestSeconds ? formatHours(totals.longestSeconds) : '–'}
          </span>
        </div>
      </div>
      {before && before.count > 0 && (
        <p className="hint">
          {beforeName[period]}: {formatDistance(before.meters, unit)}, {formatHours(before.seconds)}, {before.count}{' '}
          {before.count === 1 ? 'workout' : 'workouts'}.
        </p>
      )}

      <section className="card" aria-label="Each week">
        <h2 className="card__title card__title--small">{byDistance ? 'Distance' : 'Time'}, each week</h2>
        <div className="bars" role="img" aria-label={`${byDistance ? 'Distance' : 'Time'} for each of the last eight weeks`}>
          {weeks.map((week) => {
            const value = byDistance ? week.meters : week.seconds;
            return (
              <div key={week.from} className="bars__col">
                <span className="bars__value">{value ? (byDistance ? inUnit(week.meters, unit).toFixed(0) : Math.round(week.seconds / 60)) : ''}</span>
                <span className="bars__bar" style={{ height: `${Math.max(2, (value / tallest) * 100)}%` }} />
                <span className="bars__label">{new Date(`${week.from}T12:00:00`).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="Workouts" className="entries">
        <h2 className="label">Workouts</h2>
        {entries && list.length === 0 && (
          <div className="empty">
            <p className="muted">Nothing logged yet.</p>
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'entry' })}>
              Log a workout
            </button>
          </div>
        )}
        {list.map((entry) => {
          const pace = entry.seconds && entry.meters ? paceOf(entry.seconds, entry.meters, unit) : undefined;
          const facts = [
            entry.meters ? formatDistance(entry.meters, unit) : undefined,
            entry.seconds ? formatDuration(entry.seconds) : undefined,
            pace ? formatPace(pace, unit) : undefined,
            entry.avgHr ? `${entry.avgHr} bpm` : undefined,
          ].filter(Boolean);
          return (
            <button key={entry.id} type="button" className="entry-row" onClick={() => nav.go({ name: 'entry', id: entry.id })}>
              <span className="entry-row__day">{dayLabel(entry.date, today, true)}</span>
              <span className="entry-row__text">
                <span>{entry.workoutTitle ?? activities[entry.activity]}</span>
                <span className="entry-row__facts">{facts.join(' · ') || activities[entry.activity]}</span>
              </span>
              <span className="entry-row__felt">{entry.felt ? feelings[entry.felt] : ''}</span>
              <ChevronIcon size={16} />
            </button>
          );
        })}
      </section>
    </div>
  );
}
