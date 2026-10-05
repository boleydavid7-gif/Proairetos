import { useMemo, useSyncExternalStore } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings, useTraining } from '../app/state';
import { dateLabel, effectiveGoalOz, formatVolume, greeting, localDate, sameDay, totalOz, type HydrosUnit } from '../core/drinks';
import { rangeForTraining } from '../data/training';
import { hydrosQuoteFor } from '../core/quotes';
import { GearIcon } from '../app/icons';
import { Brand } from '../app/ui';
import { displayName, subscribePreferences } from '../../data/storage/preferences';

export default function TodayPage({ nav }: { nav: Nav }) {
  const drinks = useDrinks() ?? [];
  const settings = useSettings();
  const training = useTraining();
  const today = useMemo(() => drinks.filter((drink) => sameDay(drink)), [drinks]);
  const amount = totalOz(today);
  const unit = settings.unit ?? 'oz';
  const range = rangeForTraining(settings, training ?? { runDay: false, loggedRun: false });
  const goal = effectiveGoalOz(settings) + range.extra;
  const percent = goal > 0 ? Math.min(100, Math.max(0, (amount / goal) * 100)) : 0;
  const hasData = today.length > 0;
  const name = useSyncExternalStore(subscribePreferences, displayName, displayName);
  const todayDate = useMemo(() => new Date(), []);
  const quote = hydrosQuoteFor(localDate(todayDate));

  return (
    <div className="hydros-home">
      <section className="hydros-hero hydros-hero--today">
        <div className="hydros-home-head">
          <Brand light />
          <button type="button" className="hydros-settings-button" aria-label="Settings" onClick={() => nav.go({ name: 'settings' })}>
            <GearIcon size={21} />
          </button>
        </div>
        <div className="hydros-hero__words">
          <p>{greeting(todayDate)}{name ? `, ${name}` : ''}</p>
          <span>{dateLabel(todayDate)}</span>
          <blockquote className="hydros-quote">“{quote.text}”<cite>— {quote.source}</cite></blockquote>
        </div>
        <div className="hydros-orb" aria-label={`${formatVolume(amount, unit as HydrosUnit)} of ${formatVolume(goal, unit as HydrosUnit)} ${unit}`}>
          <div className="hydros-orb__water" style={{ height: `${percent}%` }} />
          <strong>{formatVolume(amount, unit as HydrosUnit)}<small>/{formatVolume(goal, unit as HydrosUnit)} {unit}</small></strong>
          <span>{hasData ? 'of your daily goal' : 'Daily goal'}</span>
          <em>{hasData ? `${formatVolume(range.min, unit as HydrosUnit)} – ${formatVolume(range.max, unit as HydrosUnit)} ${unit}` : `${formatVolume(goal, unit as HydrosUnit)} ${unit} goal`}</em>
        </div>
      </section>

    </div>
  );
}
