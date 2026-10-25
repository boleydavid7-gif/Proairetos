import { useMemo, useState, type CSSProperties } from 'react';
import YearPage from '../../app/family/YearPage';
import { hydrosYear } from '../core/year';
import type { Nav } from '../app/App';
import { useDrinks, useSettings } from '../app/state';
import { useDays } from '../app/day';
import DrinkEntry from '../app/DrinkEntry';
import { defaultDrinkProfiles, drinkDay, effectiveGoalOz, formatVolume, hydrationOz, localDate, monthDates, startOfWeek, weekDates, weekNumber, type HydrosUnit } from '../core/drinks';
import { ScreenHeader, Segmented } from '../app/ui';
import { Sym } from '../../lamplight/icons';
import IconButton from '../../components/ui/IconButton';

type Span = 'Week' | 'Month';
const PAGE = 30;

export default function FlowPage({ nav }: { nav: Nav }) {
  const drinks = useDrinks() ?? [];
  const settings = useSettings();
  const [span, setSpan] = useState<Span>('Week');
  const [showYear, setShowYear] = useState(false);
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek());
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [shown, setShown] = useState(PAGE);
  const range = span === 'Week' ? weekDates(weekCursor) : monthDates(monthCursor);
  const { dayOf } = useDays(range[0], range[range.length - 1]);
  const unit = (settings.unit ?? 'oz') as HydrosUnit;
  const profiles = settings.drinkProfiles?.length ? settings.drinkProfiles : defaultDrinkProfiles();
  const days = useMemo(() => new Map(drinks.map((drink) => [drink.id, dayOf(drink)])), [drinks, dayOf]);
  const values = useMemo(() => range.map((day) => hydrationOz(drinks.filter((drink) => days.get(drink.id) === day), profiles)), [drinks, days, profiles, range.join(',')]);
  const periodDrinks = useMemo(() => drinks.filter((drink) => range.includes(days.get(drink.id) ?? '')), [drinks, days, range.join(',')]);
  const goal = settings.goalChosen ? effectiveGoalOz(settings) : undefined;
  const loggedDays = values.filter((value) => value > 0).length;
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = loggedDays ? total / loggedDays : 0;
  const highest = Math.max(0, ...values);
  const goalDays = goal ? values.filter((value) => value >= goal).length : undefined;
  // About a liter at least (amounts are in ounces), so an empty or light week keeps a readable scale; no target is
  // drawn from it.
  const max = Math.max(goal ?? 0, ...values, 32) * 1.1;
  const periodTitle = span === 'Week'
    ? `Week ${weekNumber(weekCursor)} · ${weekCursor.getFullYear()}`
    : monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const isCurrent = range.includes(localDate());

  const movePeriod = (direction: number) => {
    setShown(PAGE);
    if (span === 'Week') {
      const next = new Date(weekCursor);
      next.setDate(next.getDate() + direction * 7);
      setWeekCursor(next);
      return;
    }
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + direction, 1));
  };

  if (showYear) return <div className="hydros-screen family-surface"><YearPage dates={drinks.map((drink) => drinkDay(drink))} build={(year) => hydrosYear(drinks, year, unit, (drink) => drinkDay(drink))} onBack={() => setShowYear(false)} /></div>;
  return <div className="hydros-screen hydros-flow">
    <ScreenHeader title="Your flow" onBack={nav.back} />
    <Segmented items={['Week', 'Month'] as const} selected={span} onSelect={(next) => { setSpan(next); setShown(PAGE); }} />
    <div className="flow-period" aria-label={`${span} to show`}>
      <IconButton size="sm" className="flow-period__button" label={`Previous ${span.toLowerCase()}`} onClick={() => movePeriod(-1)}><Sym name="back" /></IconButton>
      <strong>{periodTitle}</strong>
      <IconButton size="sm" className="flow-period__button" label={`Next ${span.toLowerCase()}`} onClick={() => movePeriod(1)}><Sym name="chevron" /></IconButton>
    </div>
    <div className="flow-chart-card">
      {span === 'Week'
        ? <DailyChart range={range} values={values} max={max} goal={goal} unit={unit} />
        : <MonthlyLineChart range={range} values={values} max={max} goal={goal} unit={unit} />}
      <div className="flow-legend"><span><i className="is-cyan" /> Counted</span>{goal ? <span><i className="is-dash" /> Your daily amount</span> : null}</div>
    </div>
    <section className="hydros-insights" aria-label={`${span} facts`}>
      <article className="hydros-insight-card">
        <small>Logged on</small>
        <strong>{loggedDays} of {range.length}</strong>
        <small>{loggedDays === 1 ? 'one day with drinks' : 'days with drinks'}</small>
      </article>
      <article className="hydros-insight-card">
        <small>Average</small>
        <strong>{average ? formatVolume(average, unit) : '—'}{average ? ` ${unit}` : ''}</strong>
        <small>{average ? 'on logged days' : 'Start logging to see this'}</small>
      </article>
      <article className="hydros-insight-card">
        <small>Highest day</small>
        <strong>{highest ? `${formatVolume(highest, unit)} ${unit}` : '—'}</strong>
        <small>{highest ? 'counted intake' : 'No drinks logged yet'}</small>
      </article>
      {goalDays !== undefined && <article className="hydros-insight-card">
        <small>Reached your amount</small>
        <strong>{goalDays} of {range.length}</strong>
        <small>{goalDays === 1 ? 'day' : 'days'}</small>
      </article>}
    </section>
    <section className="recent-entries">
      <div className="hydros-section-title"><h2>{isCurrent ? (span === 'Week' ? 'This week' : 'This month') : periodTitle}</h2></div>
      {periodDrinks.length ? periodDrinks.slice(0, shown).map((drink) => <DrinkEntry key={drink.id} drink={drink} profiles={profiles} unit={unit} />) : <p className="pattern-empty">Nothing logged in this {span.toLowerCase()}.</p>}
      {periodDrinks.length > shown && <button type="button" className="recent-entry__cancel hydros-more" onClick={() => setShown(shown + PAGE)}>Show more</button>}
    </section>
    <button type="button" className="recent-entry__cancel hydros-more" onClick={() => setShowYear(true)}>Your year</button>
  </div>;
}

function DailyChart({ range, values, max, goal, unit }: { range: string[]; values: number[]; max: number; goal?: number; unit: HydrosUnit }) {
  return <div className="flow-chart" aria-label="Week chart, one bar a day">
    <div className="flow-chart__grid"><span>{formatVolume(max, unit)} {unit}</span><span>{formatVolume(max * .75, unit)} {unit}</span><span>{formatVolume(max * .5, unit)} {unit}</span><span>0</span></div>
    {goal ? <div className="flow-chart__goal" style={{ bottom: `calc(26px + (100% - 26px) * ${goal / max})` }} aria-hidden="true" /> : null}
    <div className="flow-chart__bars">{values.map((value, index) => <div className="flow-chart__bar-wrap" key={`${range[index]}-${index}`}><div className={value ? 'flow-chart__bar ll-rise ll-lit ll-travel' : 'flow-chart__bar'} style={{ height: `${Math.max(value ? 7 : 2, (value / max) * 100)}%`, '--i': index } as CSSProperties} /><small>{new Date(`${range[index]}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</small></div>)}</div>
  </div>;
}

function MonthlyLineChart({ range, values, max, goal, unit }: { range: string[]; values: number[]; max: number; goal?: number; unit: HydrosUnit }) {
  const width = 360;
  const height = 220;
  const left = 38;
  const right = 8;
  const top = 13;
  const bottom = 29;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index: number) => left + (range.length === 1 ? plotWidth / 2 : (index / (range.length - 1)) * plotWidth);
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const labelIndexes = Array.from(new Set([0, Math.floor((range.length - 1) / 2), range.length - 1]));
  return <div className="flow-line-chart" aria-label={`Month chart, day 1 to day ${range.length}`}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
      {[0, .25, .5, .75, 1].map((fraction) => <g key={fraction}><line className="flow-line-chart__grid" x1={left} x2={width - right} y1={top + plotHeight * (1 - fraction)} y2={top + plotHeight * (1 - fraction)} /><text className="flow-line-chart__value" x={left - 7} y={top + plotHeight * (1 - fraction) + 3} textAnchor="end">{formatVolume(max * fraction, unit)}</text></g>)}
      {goal ? <line className="flow-line-chart__goal" x1={left} x2={width - right} y1={y(goal)} y2={y(goal)} /> : null}
      <polyline className="flow-line-chart__line ll-draw" points={points} pathLength={1} />
      {values.map((value, index) => <circle className="flow-line-chart__point ll-land" key={range[index]} cx={x(index)} cy={y(value)} r="2.5" style={{ '--i': index } as CSSProperties} />)}
      {labelIndexes.map((index) => <text className="flow-line-chart__axis" key={range[index]} x={x(index)} y={height - 7} textAnchor="middle">{index + 1}</text>)}
    </svg>
  </div>;
}
