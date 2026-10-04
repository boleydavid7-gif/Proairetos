import { useMemo } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings, useTraining } from '../app/state';
import { dateLabel, greeting, sameDay, totalOz } from '../core/drinks';
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
  const goal = training?.runDay ? settings.goalOz + range.extra : settings.goalOz;
  const percent = Math.min(100, Math.round((amount / goal) * 100));
  const name = displayName();
  const quote = hydrosLineFor();
  return (
    <div className="hydros-home">
      <section className="hydros-hero hydros-hero--today">
        <div className="hydros-hero__words"><p>{greeting()}{name ? ',' : ''}{name ? <strong>{name}</strong> : null}</p><span>{dateLabel()}</span></div>
        <blockquote className="hydros-quote">“{quote.text}”<cite>— {quote.source}</cite></blockquote>
        <div className="hydros-orb" aria-label={`${amount} of ${goal} ounces`}><div className="hydros-orb__water" style={{ height: `${percent}%` }}><img src={waterTexture} alt="" /></div><img className="hydros-orb__image" src={orbImage} alt="" /><strong>{amount}<small>/{goal} oz</small></strong></div>
      </section>
    </div>
  );
}
