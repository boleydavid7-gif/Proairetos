import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings } from '../app/state';
import { caffeine, effectiveGoalOz, formatVolume, kindLabel, localDate, sourceBreakdown, totalOz, volumeLabel, type Drink, type HydrosUnit } from '../core/drinks';
import { CupIcon, DropIcon, MoonIcon, SunIcon, WaveIcon } from '../app/icons';
import { ScreenHeader, Segmented } from '../app/ui';

type Span = 'Day' | 'Week' | 'Month' | 'All Time';
const days = (n: number) => Array.from({ length: n }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (n - index - 1)); return localDate(date); });

export default function FlowPage({ nav }: { nav: Nav }) {
  const drinks = useDrinks() ?? [];
  const settings = useSettings();
  const [span, setSpan] = useState<Span>('Day');
  const range = span === 'Day' ? days(7) : span === 'Week' ? days(28) : span === 'Month' ? days(90) : days(180);
  const unit = settings.unit ?? 'oz';
  const values = useMemo(() => range.map((day) => totalOz(drinks.filter((drink) => localDate(new Date(drink.loggedAt)) === day))), [drinks, range.join(',')]);
  const periodDrinks = useMemo(() => drinks.filter((drink) => range.includes(localDate(new Date(drink.loggedAt)))), [drinks, range.join(',')]);
  const patterns = useMemo(() => buildPatterns(periodDrinks, range, unit), [periodDrinks, range.join(','), unit]);
  const max = Math.max(settings.usualMaxOz, effectiveGoalOz(settings), ...values, 1);
  return <div className="hydros-screen"><ScreenHeader title="Your Flow" onBack={nav.back} /><Segmented items={['Day', 'Week', 'Month', 'All Time'] as const} selected={span} onSelect={setSpan} /><div className={`flow-chart${periodDrinks.length ? '' : ' is-empty'}`} aria-label="Hydration flow chart"><div className="flow-chart__grid"><span>{formatVolume(max, unit)} {unit}</span><span>{formatVolume(max * .75, unit)} {unit}</span><span>{formatVolume(max * .5, unit)} {unit}</span><span>0</span></div><div className="flow-chart__bars">{values.map((value, index) => <div className="flow-chart__bar-wrap" key={`${range[index]}-${index}`}><div className="flow-chart__bar" style={{ height: `${Math.max(value ? 7 : 2, (value / max) * 100)}%` }} /><small>{new Date(`${range[index]}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</small></div>)}</div></div><div className="flow-legend"><span><i className="is-cyan" /> Your intake</span><span><i className="is-dash" /> {periodDrinks.length ? `Your ${unit} range` : 'Set amount'}</span></div><section className="pattern-card"><div className="hydros-section-title"><h2>Key Patterns</h2></div>{patterns.length ? patterns.map((pattern) => <Pattern key={pattern.title} icon={pattern.icon} text={pattern.text} />) : <p className="pattern-empty">No drinks logged in this period.</p>}</section></div>;
}

function Pattern({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="pattern-row"><span>{icon}</span><p>{text}</p></div>; }

function buildPatterns(drinks: Drink[], range: string[], unit: HydrosUnit): { title: string; text: string; icon: React.ReactNode }[] {
  if (!drinks.length) return [];
  const daysLogged = new Set(drinks.map((drink) => localDate(new Date(drink.loggedAt)))).size;
  const sources = sourceBreakdown(drinks);
  const source = sources[0];
  const times = [
    { label: 'Morning', count: drinks.filter((drink) => new Date(drink.loggedAt).getHours() < 12).length, icon: <SunIcon /> },
    { label: 'Afternoon', count: drinks.filter((drink) => { const hour = new Date(drink.loggedAt).getHours(); return hour >= 12 && hour < 18; }).length, icon: <WaveIcon /> },
    { label: 'Evening', count: drinks.filter((drink) => new Date(drink.loggedAt).getHours() >= 18).length, icon: <MoonIcon /> },
  ].sort((a, b) => b.count - a.count);
  const patterns: { title: string; text: string; icon: React.ReactNode }[] = [
    { title: 'Days logged', text: `${daysLogged} of ${range.length} days`, icon: <DropIcon /> },
    { title: 'Main source', text: `${kindLabel(source.kind)} · ${volumeLabel(source.amountOz, unit)}`, icon: <DropIcon /> },
  ];
  if (times[0].count > 0) patterns.push({ title: 'Most logged time', text: `${times[0].label} · ${times[0].count} drinks`, icon: times[0].icon });
  const caffeineMg = caffeine(drinks);
  if (caffeineMg > 0) patterns.push({ title: 'Caffeine logged', text: `${caffeineMg} mg`, icon: <CupIcon /> });
  return patterns;
}
