import { useMemo } from 'react';
import type { BalanceDetailId, Nav } from '../app/App';
import { useDrinks, useSettings, useTraining } from '../app/state';
import { caffeine, kindLabel, sameDay, sourceBreakdown, totalOz, type Drink } from '../core/drinks';
import { rangeForTraining } from '../data/training';
import { BalanceIcon, BoltIcon, CupIcon, DropIcon, WaveIcon } from '../app/icons';
import { ScreenHeader } from '../app/ui';

const titles: Record<BalanceDetailId, string> = {
  dailyBalance: 'Daily Balance',
  caffeine: 'Caffeine',
  electrolytes: 'Electrolytes',
  rhythm: 'Daily Rhythm',
  support: 'Support Tools',
};

export default function BalanceDetailPage({ nav, id }: { nav: Nav; id: BalanceDetailId }) {
  const drinks = useDrinks() ?? [];
  const today = useMemo(() => drinks.filter((drink) => sameDay(drink)), [drinks]);
  const settings = useSettings();
  const training = useTraining();
  const range = rangeForTraining(settings, training ?? { runDay: false, loggedRun: false });
  const amount = totalOz(today);
  const morning = today.filter((drink) => new Date(drink.loggedAt).getHours() < 12).length;
  const afternoon = today.filter((drink) => {
    const hour = new Date(drink.loggedAt).getHours();
    return hour >= 12 && hour < 18;
  }).length;
  const evening = today.filter((drink) => new Date(drink.loggedAt).getHours() >= 18).length;
  const dailyRows: [string, string][] = [
    ['Today', `${amount} oz`],
    ['Usual range', `${settings.usualMinOz}–${settings.usualMaxOz} oz`],
    ['Run day range', training?.runDay ? `${range.min}–${range.max} oz` : 'No run today'],
  ];
  const rhythmRows: [string, string][] = [['Morning', `${morning} drinks`], ['Afternoon', `${afternoon} drinks`], ['Evening', `${evening} drinks`]];
  const supportRows: [string, string][] = [
    ['Range', `${range.min}–${range.max} oz today`],
    ['Askesis', training?.runDay ? 'Run day range in use' : 'No run day adjustment'],
    ['Add', 'Log a drink from the Add tab'],
  ];

  let body: React.ReactNode;
  if (id === 'dailyBalance') {
    body = <><Summary icon={<DropIcon />} value={`${amount} oz`} detail={`${range.min}–${range.max} oz range`} /><MetricCards rows={dailyRows} /><SourceRows drinks={today} mode="hydration" empty="No drinks logged today." /></>;
  } else if (id === 'caffeine') {
    body = <><Summary icon={<CupIcon />} value={`${caffeine(today)} mg`} detail="From today’s drinks" /><SourceRows drinks={today.filter((drink) => (drink.caffeineMg ?? 0) > 0)} mode="caffeine" empty="No caffeine logged today." /></>;
  } else if (id === 'electrolytes') {
    body = <><Summary icon={<BoltIcon />} value={`${today.filter((drink) => drink.kind === 'electrolyte').length}`} detail="electrolyte drinks today" /><SourceRows drinks={today.filter((drink) => drink.kind === 'electrolyte')} mode="electrolyte" empty="No electrolytes logged today." /></>;
  } else if (id === 'rhythm') {
    body = <><Summary icon={<WaveIcon />} value={`${today.length} drinks`} detail="Across the day" /><InfoRows rows={rhythmRows} /></>;
  } else {
    body = <><Summary icon={<BalanceIcon />} value="Reminders" detail="Keep the measure visible" /><InfoRows rows={supportRows} /></>;
  }

  return <div className="hydros-screen hydros-detail"><ScreenHeader title={titles[id]} onBack={nav.back} />{body}</div>;
}

function Summary({ icon, value, detail }: { icon: React.ReactNode; value: string; detail: string }) {
  return <section className="hydros-detail-summary"><span className="balance-row__icon">{icon}</span><strong>{value}</strong><small>{detail}</small></section>;
}

function InfoRows({ rows }: { rows: [string, string][] }) {
  return <section className="hydros-info-list">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>;
}

function MetricCards({ rows }: { rows: [string, string][] }) {
  return <section className="hydros-metric-cards">{rows.map(([label, value]) => <div className="hydros-metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>;
}

function SourceRows({ drinks, mode, empty }: { drinks: Drink[]; mode: 'hydration' | 'caffeine' | 'electrolyte'; empty: string }) {
  const sources = sourceBreakdown(drinks);
  return <section className="hydros-source-list"><h2>Sources</h2>{sources.length ? sources.map((source) => <div className="hydros-source-row" key={source.kind}><span><strong>{kindLabel(source.kind)}</strong><small>{source.count} {source.count === 1 ? 'drink' : 'drinks'}</small></span><b>{mode === 'caffeine' ? `${source.caffeineMg} mg` : `${source.amountOz} oz`}</b></div>) : <p className="hydros-detail-empty">{empty}</p>}</section>;
}
