import { RollingNumber } from '../../lamplight/RollingNumber';
import { endsWith, useLaunchedFile } from '../../app/family/launchFiles';
import { useEffect, useRef, useState } from 'react';
import { ColumnChart, LineChart, type ChartPoint } from '../../app/family/charts';
import { readActivityFile } from '../core/track';
import { mondayOnOrBefore, toLocalDate } from '../../core/scheduling/dates';
import type { Nav } from '../app/App';
import { ChevronIcon, LogIcon, PlusIcon } from '../app/icons';
import { useEntries, useSettings, useToday } from '../app/state';
import { Brand, dayLabel, Segmented } from '../app/ui';
import { activities, feelings, logCsv, newestFirst, periodComparison, periodRange, recordFacts, totalsBetween, weeklyTotals, type Activity, type LogEntry, type Period } from '../core/log';
import { formatDistance, formatDuration, formatHours, formatPace, inUnit, paceOf } from '../core/pace';
import { howItFelt } from '../core/progress';
import Empty from '../../app/family/Empty';
import IconButton from '../../components/ui/IconButton';
import { useShoes } from '../app/shoes';
import { addHeldHealthWorkouts } from '../../app/health/health';

type ProgressView = 'overview' | 'history';
type HistoryActivity = Activity | 'all';

const views: { id: ProgressView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
];

const periods: { id: Period; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All time' },
];

const weekLabel = (from: string) => {
  const start = new Date(`${from}T12:00:00`);
  return start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** Progress has two views: an overview (totals, running trends, the last eight weeks) and the full log. */
export default function LogPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const today = useToday();
  const entries = useEntries();
  const shoes = useShoes();
  const [view, setView] = useState<ProgressView>('overview');
  const [period, setPeriod] = useState<Period>('week');
  const [historySearch, setHistorySearch] = useState('');
  const [historyActivity, setHistoryActivity] = useState<HistoryActivity>('all');
  const file = useRef<HTMLInputElement>(null);
  const [fileProblem, setFileProblem] = useState('');
  // Runs an older version held for review are added to the log.
  useEffect(() => { void addHeldHealthWorkouts(); }, []);

  const bringIn = async (chosen: File | undefined) => {
    if (!chosen) return;
    const read = readActivityFile(await chosen.text(), toLocalDate);
    if (!read) return setFileProblem('That file has no run in it. A .gpx or .tcx file works.');
    setFileProblem('');
    nav.go({ name: 'entry', date: read.date, seconds: read.seconds, meters: read.meters, activity: read.activity });
  };
  useLaunchedFile(endsWith('.gpx', '.tcx'), (chosen) => void bringIn(chosen));

  const unit = settings.unit;
  const list = [...(entries ?? [])].sort(newestFirst);
  const range = periodRange(period, today);
  const totals = totalsBetween(list, range.from, range.to);
  const comparison = periodComparison(period, today);
  const previousTotals = comparison ? totalsBetween(list, comparison.previous.from, comparison.previous.to) : undefined;
  const compared = (current: number, previous: number | undefined, format: (value: number) => string) => {
    if (!previousTotals || previousTotals.count === 0 || previous === undefined) return 'No earlier data';
    const change = current - previous;
    if (change === 0) return `No change vs ${comparison!.label}`;
    const amount = format(Math.abs(change));
    return `${change > 0 ? '+' : '−'}${amount} vs ${comparison!.label}`;
  };
  const distanceChange = compared(totals.meters, previousTotals?.meters, (value) =>
    inUnit(value, unit) < 0.05 ? `less than 0.1 ${unit}` : formatDistance(value, unit),
  );
  const timeChange = compared(totals.seconds, previousTotals?.seconds, (value) =>
    value < 30 ? 'less than 1 min' : formatHours(value),
  );
  const workoutChange = compared(totals.count, previousTotals?.count, (value) => `${value} ${value === 1 ? 'workout' : 'workouts'}`);

  const runningEntries = list.filter((entry) => entry.activity === 'run' || Boolean(entry.workoutId));
  const runningTotals = totalsBetween(runningEntries, range.from, range.to);
  const averagePace = runningTotals.meters && runningTotals.seconds
    ? paceOf(runningTotals.seconds, runningTotals.meters, unit)
    : undefined;
  const runRecords = recordFacts(runningEntries, unit);
  const overviewWeeks = weeklyTotals(list, 8, today);
  const overviewByDistance = overviewWeeks.some((week) => week.meters > 0);
  const trendWeeks = weeklyTotals(runningEntries, 12, today);
  const performanceDistance = trendWeeks.map((week): ChartPoint => ({
    at: new Date(`${week.from}T12:00:00`).getTime(),
    values: [Math.round(inUnit(week.meters, unit) * 10) / 10],
    label: `Week of ${weekLabel(week.from)}`,
  }));
  const performanceTime = trendWeeks.map((week): ChartPoint => ({
    at: new Date(`${week.from}T12:00:00`).getTime(),
    values: [Math.round(week.seconds / 60)],
    label: `Week of ${weekLabel(week.from)}`,
  }));

  const consistencyWeeks = weeklyTotals(runningEntries, 8, today);
  const consistencyFrom = consistencyWeeks[0]?.from ?? mondayOnOrBefore(today);
  const consistencyEntries = runningEntries.filter((entry) => entry.date >= consistencyFrom && entry.date <= today);
  const activeDays = new Set(consistencyEntries.map((entry) => entry.date)).size;
  const activeWeeks = consistencyWeeks.filter((week) => week.count > 0).length;
  const sessionCount = consistencyWeeks.reduce((sum, week) => sum + week.count, 0);
  const averageSessions = activeWeeks ? sessionCount / activeWeeks : 0;
  const feltSummary = howItFelt(runningEntries, today);

  const filteredHistory = list.filter((entry) => {
    if (historyActivity !== 'all' && entry.activity !== historyActivity) return false;
    const query = historySearch.trim().toLocaleLowerCase();
    if (!query) return true;
    const searchable = [
      entry.date,
      activities[entry.activity],
      entry.workoutTitle,
      entry.notes,
      entry.wentWell,
      entry.nextTime,
      entry.shoeId ? shoes.find((shoe) => shoe.id === entry.shoeId)?.name : undefined,
    ].filter(Boolean).join(' ').toLocaleLowerCase();
    return searchable.includes(query);
  });

  const historyGroups = filteredHistory.reduce<{ key: string; label: string; entries: LogEntry[] }[]>((groups, entry) => {
    const key = entry.date.slice(0, 7);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const [year, month] = key.split('-').map(Number);
      group = { key, label: new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
    return groups;
  }, []);

  const exportLog = () => {
    const link = document.createElement('a');
    const shoeNames = Object.fromEntries(shoes.map((shoe) => [shoe.id, shoe.name]));
    link.href = URL.createObjectURL(new Blob([logCsv(list, unit, shoeNames)], { type: 'text/csv;charset=utf-8' }));
    link.download = `askesis-log-${today}.csv`;
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  };

  const workoutRows = (items: LogEntry[]) => items.map((entry) => {
    const shoe = entry.shoeId ? shoes.find((each) => each.id === entry.shoeId) : undefined;
    const pace = (entry.activity === 'run' || entry.workoutId) && entry.seconds && entry.meters
      ? paceOf(entry.seconds, entry.meters, unit)
      : undefined;
    const facts = [
      entry.meters ? formatDistance(entry.meters, unit) : undefined,
      entry.seconds ? formatDuration(entry.seconds) : undefined,
      pace ? formatPace(pace, unit) : undefined,
      entry.avgHr ? `${entry.avgHr} bpm` : undefined,
      shoe?.name,
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
  });

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

      <div className="progress__views">
        <Segmented label="Progress sections" value={view} options={views} onChange={setView} small />
      </div>

      {view === 'overview' && (
        <div className="progress__period">
          <Segmented label="Period" value={period} options={periods} onChange={setPeriod} small />
        </div>
      )}

      {view === 'overview' && (
        <div className="progress__content progress__content--overview">
          <div className="tiles">
            <div className="tile">
              <span className="tile__label">Total distance</span>
              <span className="tile__value"><RollingNumber value={totals.meters} format={(meters) => formatDistance(meters, unit)} /></span>
              {period !== 'all' && <span className="tile__change">{distanceChange}</span>}
            </div>
            <div className="tile">
              <span className="tile__label">Total time</span>
              <span className="tile__value"><RollingNumber value={totals.seconds} format={(seconds) => formatHours(Math.round(seconds))} /></span>
              {period !== 'all' && <span className="tile__change">{timeChange}</span>}
            </div>
            <div className="tile">
              <span className="tile__label">Workouts</span>
              <span className="tile__value"><RollingNumber value={totals.count} /></span>
              {period !== 'all' && <span className="tile__change">{workoutChange}</span>}
            </div>
            <div className="tile">
              <span className="tile__label">Longest</span>
              <span className="tile__value">
                {totals.longestMeters ? formatDistance(totals.longestMeters, unit) : totals.longestSeconds ? formatHours(totals.longestSeconds) : '–'}
              </span>
            </div>
          </div>

          {list.length > 0 && (
            <section className="card progress__panel progress__overview-trend">
              <ColumnChart
                title={overviewByDistance ? `Distance (${unit}), each week` : 'Minutes, each week'}
                days={overviewWeeks.map((week) => ({
                  label: weekLabel(week.from),
                  long: `Week of ${weekLabel(week.from)}`,
                  value: overviewByDistance ? Math.round(inUnit(week.meters, unit) * 10) / 10 : Math.round(week.seconds / 60),
                }))}
              />
            </section>
          )}

          {(runRecords.longestDistance || runRecords.longestDuration || runRecords.fastestPace) && (
            <section className="card records progress__panel progress__overview-records" aria-label="Recorded facts">
              <div className="records__head">
                <h2 className="card__title card__title--small">Personal records</h2>
                <span className="card__eyebrow">All time</span>
              </div>
              <div className="records__grid">
                {runRecords.longestDistance && <div><span className="tile__label">Longest distance</span><strong>{formatDistance(runRecords.longestDistance.meters!, unit)}</strong></div>}
                {runRecords.longestDuration && <div><span className="tile__label">Longest run</span><strong>{formatHours(runRecords.longestDuration.seconds!)}</strong></div>}
                {runRecords.fastestPace && <div><span className="tile__label">Fastest pace</span><strong>{formatPace(runRecords.fastestPace.secondsPerUnit, unit)}</strong></div>}
              </div>
            </section>
          )}

          <section aria-label="Recent workouts" className="entries progress__panel progress__recent">
            <div className="progress__section-head">
              <h2 className="label">Recent workouts</h2>
              {list.length > 4 && <button type="button" className="text-link" onClick={() => setView('history')}>View history</button>}
            </div>
            {entries && list.length === 0 && (
              <Empty icon={<LogIcon size={28} />} title="Nothing logged yet">
                <button type="button" className="button-main" onClick={() => nav.go({ name: 'entry' })}>Log a workout</button>
              </Empty>
            )}
            {workoutRows(list.slice(0, 4))}
          </section>

          {runningEntries.length > 0 && (
            <section className="progress__running" aria-label="Running">
              <h2 className="label">Running</h2>
            <div className="tiles">
              <div className="tile">
                <span className="tile__label">Running distance</span>
                <span className="tile__value">{formatDistance(runningTotals.meters, unit)}</span>
              </div>
              <div className="tile">
                <span className="tile__label">Running time</span>
                <span className="tile__value">{formatHours(runningTotals.seconds)}</span>
              </div>
              <div className="tile">
                <span className="tile__label">Average pace</span>
                <span className="tile__value">{averagePace ? formatPace(averagePace, unit) : '–'}</span>
              </div>
            </div>

            {runningEntries.length > 0 && (
              <>
                {runningEntries.some((entry) => (entry.meters ?? 0) > 0) && (
                  <section className="card progress__panel progress__performance-distance">
                    <LineChart title={`Distance per week (${unit}), last 12 weeks`} points={performanceDistance} series={[{ name: 'Distance' }]} unit={unit} />
                  </section>
                )}
                {runningEntries.some((entry) => (entry.seconds ?? 0) > 0) && (
                  <section className="card progress__panel progress__performance-time">
                    <LineChart title="Running time per week, last 12 weeks" points={performanceTime} series={[{ name: 'Time' }]} unit="min" />
                  </section>
                )}
              </>
            )}
            </section>
          )}

          {runningEntries.length > 0 && (
            <section className="progress__rhythm" aria-label="The last eight weeks">
              <h2 className="label">The last eight weeks</h2>
            <div className="tiles">
              <div className="tile">
                <span className="tile__label">Running days</span>
                <span className="tile__value"><RollingNumber value={activeDays} /></span>
                <span className="tile__change">Last 8 weeks</span>
              </div>
              <div className="tile">
                <span className="tile__label">Active weeks</span>
                <span className="tile__value">{activeWeeks} of 8</span>
                <span className="tile__change">At least one logged run</span>
              </div>
              <div className="tile">
                <span className="tile__label">Sessions</span>
                <span className="tile__value"><RollingNumber value={sessionCount} /></span>
                <span className="tile__change">Last 8 weeks</span>
              </div>
              <div className="tile">
                <span className="tile__label">Per active week</span>
                <span className="tile__value">{averageSessions.toFixed(1)}</span>
                <span className="tile__change">Average sessions</span>
              </div>
            </div>

            <section className="card progress__panel progress__consistency-chart">
              <ColumnChart
                title="Sessions each week"
                days={consistencyWeeks.map((week) => ({
                  label: weekLabel(week.from),
                  long: `Week of ${weekLabel(week.from)}`,
                  value: week.count,
                }))}
              />
            </section>

            {feltSummary && (
              <section className="card progress__panel progress__feelings">
                <h2 className="card__title card__title--small">How your runs felt</h2>
                <div className="records__grid">
                  <div><span className="tile__label">Easy or good</span><strong>{feltSummary.good}</strong></div>
                  <div><span className="tile__label">Challenging</span><strong>{feltSummary.challenging}</strong></div>
                  <div><span className="tile__label">Hard</span><strong>{feltSummary.hard}</strong></div>
                </div>
              </section>
            )}
            </section>
          )}
        </div>
      )}

      {view === 'history' && (
        <div className="progress__content progress__content--history">
          <section aria-label="Workout history" className="entries progress__history">
            <div className="progress__section-head">
              <h2 className="label">Workout history</h2>
              <span className="card__eyebrow">{filteredHistory.length} {filteredHistory.length === 1 ? 'workout' : 'workouts'}</span>
            </div>
            <div className="progress__filters">
              <input className="input" type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} aria-label="Search workouts" placeholder="Search" />
              <select className="input" value={historyActivity} onChange={(event) => setHistoryActivity(event.target.value as HistoryActivity)} aria-label="Filter by activity">
                <option value="all">All activities</option>
                {(Object.keys(activities) as Activity[]).map((activity) => <option key={activity} value={activity}>{activities[activity]}</option>)}
              </select>
            </div>
            {entries && list.length === 0 && (
              <Empty icon={<LogIcon size={28} />} title="Nothing logged yet">
                <button type="button" className="button-main" onClick={() => nav.go({ name: 'entry' })}>Log a workout</button>
              </Empty>
            )}
            {list.length > 0 && filteredHistory.length === 0 && <p className="muted progress__empty-note">No workouts match those filters.</p>}
            {historyGroups.map((group) => (
              <section className="progress__history-month" key={group.key} aria-label={group.label}>
                <h3 className="card__eyebrow">{group.label}</h3>
                {workoutRows(group.entries)}
              </section>
            ))}
          </section>

          <div className="button-row progress__history-actions">
            <button type="button" className="button-quiet" onClick={() => file.current?.click()}>From a watch file</button>
            {list.length > 0 && <button type="button" className="button-quiet" onClick={exportLog}>Export log (CSV)</button>}
          </div>
          {fileProblem && <p className="form-error" role="alert">{fileProblem}</p>}
        </div>
      )}
    </div>
  );
}
