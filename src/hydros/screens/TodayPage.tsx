import { useMemo } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings, useTraining } from '../app/state';
import { dateLabel, effectiveGoalOz, formatVolume, greeting, sameDay, totalOz, type HydrosUnit } from '../core/drinks';
import { rangeForTraining } from '../data/training';
import { hydrosLineFor } from '../core/lines';
import { displayName } from '../../data/storage/preferences';
import orbImage from '../../assets/images/scenes/hydros-orb.webp';
import waterTexture from '../../assets/images/scenes/hydros-water.webp';


export default function TodayPage({}: { nav: Nav }) {
  const drinks = useDrinks() ?? [];
  const settings = useSettings();
  const training = useTraining();
  const today = useMemo(() => drinks.filter((drink) => sameDay(drink)), [drinks]);
  const amount = totalOz(today);
  const range = rangeForTraining(settings, training ?? { runDay: false, loggedRun: false });
  const goal = training?.runDay ? effectiveGoalOz(settings) + range.extra : effectiveGoalOz(settings);
  const percent = goal > 0 ? Math.min(100, Math.max(0, (amount / goal) * 100)) : 0;
  const unit = settings.unit ?? 'oz';
  const name = displayName();
  const quote = hydrosLineFor();
  return (
    <div className="hydros-home">
      <section className="hydros-hero hydros-hero--today">
        <div className="hydros-hero__words"><p>{greeting()}{name ? ',' : ''}{name ? <strong>{name}</strong> : null}</p><span>{dateLabel()}</span></div>
        <blockquote className="hydros-quote">“{quote.text}”<cite>— {quote.source}</cite></blockquote>
        <div className="hydros-orb" aria-label={`${formatVolume(amount, unit as HydrosUnit)} of ${formatVolume(goal, unit as HydrosUnit)} ${unit}`}>
          <div className="hydros-orb__well">
            <div className="hydros-orb__water" style={{ height: `${percent}%` }}><img src={waterTexture} alt="" /></div>
          </div>
          <img className="hydros-orb__image" src={orbImage} alt="" />
          <strong>{formatVolume(amount, unit as HydrosUnit)}<small>/{formatVolume(goal, unit as HydrosUnit)} {unit}</small></strong>
        </div>
      </section>
    </div>
  );
}
