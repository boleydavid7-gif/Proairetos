import { RollingNumber } from '../../lamplight/RollingNumber';
import { endsWith, useLaunchedFile } from '../../app/family/launchFiles';
import { useRef, useState } from 'react';
import { ColumnChart } from '../../app/family/charts';
import { readActivityFile } from '../core/track';
import { toLocalDate } from '../../core/scheduling/dates';
import type { Nav } from '../app/App';
import { ChevronIcon, LogIcon, PlusIcon } from '../app/icons';
import { useEntries, useSettings, useToday } from '../app/state';
import { Brand, dayLabel, Segmented } from '../app/ui';
import { activities, feelings, logCsv, newestFirst, periodRange, recordFacts, totalsBetween, weeklyTotals, type Period } from '../core/log';
import { formatDistance, formatDuration, formatHours, formatPace, inUnit, paceOf } from '../core/pace';
import Empty from '../../app/family/Empty';
import IconButton from '../../components/ui/IconButton';

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
  const file = useRef<HTMLInputElement>(null);
  const [fileProblem, setFileProblem] = useState('');
  // A run from a watch or another app's file: opened as a new entry to look over before saving.
  // A watch file opened with Askesis on a computer comes here.
  useLaunchedFile(endsWith('.gpx', '.tcx'), (chosen) => void bringIn(chosen));
  const bringIn = async (chosen: File | undefined) => {
    if (!chosen) return;
    const read = readActivityFile(await chosen.text(), toLocalDate);
    if (!read) return setFileProblem('That file has no run in it. A .gpx or .tcx file works.');
    setFileProblem('');
    nav.go({ name: 'entry', date: read.date, seconds: read.seconds, meters: read.meters, activity: read.activity });
  };
  const unit = settings.unit;
  const list = [...(entries ?? [])].sort(newestFirst);
  const range = periodRange(period, today);
  const totals = totalsBetween(list, range.from, range.to);
  const before = range.before && totalsBetween(list, range.before.from, range.before.to);
  const weeks = weeklyTotals(list, 8, today);
  const byDistance = weeks.some((week) => week.meters > 0);
  const records = recordFacts(list, unit);
  const exportLog = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([logCsv(list, unit)], { type: 'text/csv;charset=utf-8' }));
    link.download = `askesis-log-${today}.csv`;
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  };

  return (
    <div className="page log-page">
      <div className="page-top">
        <Brand />
        <span data-header-actions>
          <IconButton className="round-button" label="Log a workout" onClick={() => nav.go({ name: 'entry' })}>
            <PlusIcon size={22} />
          </IconButton>
        </span>
      </div>
      <h1 className="title">Progress</h1>
      <input ref={file} type="file" accept=".gpx,.tcx,application/gpx+xml,application/vnd.garmin.tcx+xml" hidden onChange={(event) => { void bringIn(event.target.files?.[0]); event.target.value = ''; }} />
      <Segmented label="Period" value={period} options={periods} onChange={setPeriod} small />

      <div className="tiles">
        <div className="tile">
          <span className="tile__label">Total distance</span>
          <span className="tile__value"><RollingNumber value={totals.meters} format={(meters) => formatDistance(meters, unit)} /></span>
        </div>
        <div className="tile">
          <span className="tile__label">Total time</span>
          <span className="tile__value"><RollingNumber value={totals.seconds} format={(seconds) => formatHours(Math.round(seconds))} /></span>
        </div>
        <div className="tile">
          <span className="tile__label">Workouts</span>
          <span className="tile__value"><RollingNumber value={totals.count} /></span>
        </div>
        <div className="tile">
          <span className="tile__label">Longest</span>
          <span className="tile__value">
            {totals.longestMeters ? formatDistance(totals.longestMeters, unit) : totals.longestSeconds ? formatHours(totals.longestSeconds) : '–'}
          </span>
        </div>
      </div>
      {(records.longestDistance || records.longestDuration || records.fastestPace) && (
        <section className="card records" aria-label="Recorded facts">
          <div className="records__head">
            <h2 className="card__title card__title--small">Recorded facts</h2>
            <span className="card__eyebrow">All time</span>
          </div>
          <div className="records__grid">
            {records.longestDistance && <div><span className="tile__label">Longest distance</span><strong>{formatDistance(records.longestDistance.meters!, unit)}</strong></div>}
            {records.longestDuration && <div><span className="tile__label">Longest workout</span><strong>{formatHours(records.longestDuration.seconds!)}</strong></div>}
            {records.fastestPace && <div><span className="tile__label">Fastest pace</span><strong>{formatPace(records.fastestPace.secondsPerUnit, unit)}</strong></div>}
          </div>
          <p className="hint">These are the fastest, longest and farthest entries you recorded. Askesis does not score them.</p>
        </section>
      )}
      {before && before.count > 0 && (
        <p className="hint">
          {beforeName[period]}: {formatDistance(before.meters, unit)}, {formatHours(before.seconds)}, {before.count}{' '}
          {before.count === 1 ? 'workout' : 'workouts'}.
        </p>
      )}

      {list.length > 0 && <ColumnChart
        title={byDistance ? `Distance (${unit}), each week` : 'Minutes, each week'}
        days={weeks.map((week) => {
          const start = new Date(`${week.from}T12:00:00`);
          return {
            label: start.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
            long: `Week of ${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`,
            value: byDistance ? Math.round(inUnit(week.meters, unit) * 10) / 10 : Math.round(week.seconds / 60),
          };
        })}
      />}

      <section aria-label="Workouts" className="entries">
        <h2 className="label">Workouts</h2>
        {entries && list.length === 0 && (
          <Empty icon={<LogIcon size={28} />} title="Nothing logged yet" line="Runs, walks and anything else, with time and distance.">
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'entry' })}>
              Log a workout
            </button>
          </Empty>
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

      {/* Bringing in and taking out sit at the foot, after what they act on. */}
      <div className="button-row">
        <button type="button" className="button-quiet" onClick={() => file.current?.click()}>
          From a watch file
        </button>
        {list.length > 0 && (
          <button type="button" className="button-quiet" onClick={exportLog}>
            Export log (CSV)
          </button>
        )}
      </div>
      {fileProblem && <p className="form-error" role="alert">{fileProblem}</p>}
    </div>
  );
}
