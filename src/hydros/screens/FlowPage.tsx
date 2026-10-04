import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings } from '../app/state';
import { localDate, totalOz } from '../core/drinks';
import { BoltIcon, CupIcon, MoonIcon, SunIcon } from '../app/icons';
import { ScreenHeader, Segmented } from '../app/ui';

type Span = 'Day' | 'Week' | 'Month' | 'All Time';
const days = (n: number) => Array.from({ length: n }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (n - index - 1)); return localDate(date); });

export default function FlowPage({ nav }: { nav: Nav }) {
  const drinks = useDrinks() ?? [];
  const settings = useSettings();
  const [span, setSpan] = useState<Span>('Day');
  const range = span === 'Day' ? days(7) : span === 'Week' ? days(28) : span === 'Month' ? days(90) : days(180);
  const values = useMemo(() => range.map((day) => totalOz(drinks.filter((drink) => localDate(new Date(drink.loggedAt)) === day))), [drinks, range.join(',')]);
  const max = Math.max(settings.usualMaxOz, ...values, 1);
  return <div className="hydros-screen"><ScreenHeader title="Your Flow" onBack={nav.back} /><Segmented items={['Day', 'Week', 'Month', 'All Time'] as const} selected={span} onSelect={setSpan} /><div className="flow-chart" aria-label="Hydration flow chart"><div className="flow-chart__grid"><span>{max} oz</span><span>{Math.round(max * .75)} oz</span><span>{Math.round(max * .5)} oz</span><span>0</span></div><div className="flow-chart__bars">{values.map((value, index) => <div className="flow-chart__bar-wrap" key={`${range[index]}-${index}`}><div className="flow-chart__bar" style={{ height: `${Math.max(value ? 7 : 2, (value / max) * 100)}%` }} /><small>{new Date(`${range[index]}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</small></div>)}</div></div><div className="flow-legend"><span><i className="is-cyan" /> Your intake</span><span><i className="is-dash" /> Your usual range</span></div><button type="button" className="pattern-card" onClick={() => nav.go({ name: 'patterns' })}><div className="hydros-section-title"><h2>Key Patterns</h2><span className="hydros-card-chevron" aria-hidden="true">›</span></div><Pattern icon={<SunIcon />} text="Higher hydration on work days." /><Pattern icon={<MoonIcon />} text="Afternoon dip is common." /><Pattern icon={<BoltIcon />} text="More water on training days." /><Pattern icon={<CupIcon />} text="Less caffeine after 3 PM correlates with better sleep." /></button></div>;
}

function Pattern({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="pattern-row"><span>{icon}</span><p>{text}</p></div>; }
