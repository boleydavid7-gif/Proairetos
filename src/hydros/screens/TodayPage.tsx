import { useMemo, useSyncExternalStore } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings, useTraining } from '../app/state';
import { useDays, useNow } from '../app/day';
import { logDrink } from '../app/log';
import DrinkEntry from '../app/DrinkEntry';
import { caffeineFacts, dateLabel, defaultDrinkProfiles, effectiveGoalOz, formatVolume, hourLabel, hydrationOz, localDate, volumeLabel, type HydrosUnit } from '../core/drinks';
import { rangeForTraining } from '../data/training';
import { hydrosQuoteFor } from '../core/quotes';
import { GearIcon } from '../app/icons';
import { Brand } from '../app/ui';
import { displayName, subscribePreferences } from '../../data/storage/preferences';
import { greeting as proairetosGreeting } from '../../features/today/greeting';

export default function TodayPage({ nav }: { nav: Nav }) {
  const all = useDrinks();
  const drinks = all ?? [];
  const settings = useSettings();
  const training = useTraining();
  const now = useNow();
  const calendar = localDate(now);
  const { dayAt, dayOf } = useDays(calendar, calendar);
  const today = dayAt(now);
  const profiles = settings.drinkProfiles?.length ? settings.drinkProfiles : defaultDrinkProfiles();
  const todays = useMemo(() => drinks.filter((drink) => dayOf(drink) === today), [drinks, dayOf, today]);
  const amount = hydrationOz(todays, profiles);
  const unit = (settings.unit ?? 'oz') as HydrosUnit;
  const range = rangeForTraining(settings, training ?? { runDay: false, loggedRun: false });
  const extra = settings.runDayExtra === false ? 0 : range.extra;
  const goal = effectiveGoalOz(settings) + extra;
  const percent = goal > 0 ? Math.min(100, Math.max(0, (amount / goal) * 100)) : 0;
  const name = useSyncExternalStore(subscribePreferences, displayName, displayName);
  const quote = hydrosQuoteFor(today);
  const caffeine = caffeineFacts(todays);
  const last = drinks[0];
  const glasses = settings.glasses ?? [];
  const sameAsGlass = last && glasses.some((glass) => glass.profileId === last.profileId && Math.abs(glass.amountOz - last.amountOz) < 0.05);

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
          <p>{proairetosGreeting(now, name)}</p>
          <span>{dateLabel(now)}</span>
          <blockquote className="hydros-quote">“{quote.text}”<cite>— {quote.source}</cite></blockquote>
        </div>
        {settings.goalChosen ? (
          <div className="hydros-orb" aria-label={`${formatVolume(amount, unit)} of ${formatVolume(goal, unit)} ${unit}`}>
            <div className="hydros-orb__water" style={{ height: `${percent}%` }} />
            <strong>{formatVolume(amount, unit)}<small>/{formatVolume(goal, unit)} {unit}</small></strong>
            <span>{todays.length ? 'of your daily amount' : 'Daily amount'}</span>
            {extra > 0 && <em>{volumeLabel(extra, unit)} added for {range.extra && training?.loggedRun ? 'today’s run' : 'a run day'}</em>}
          </div>
        ) : (
          // No amount has been chosen yet, so nothing is measured against a number the app made up.
          <div className="hydros-orb" aria-label={`${formatVolume(amount, unit)} ${unit} today`}>
            <div className="hydros-orb__water" style={{ height: amount > 0 ? '22%' : '0%' }} />
            <strong>{formatVolume(amount, unit)}<small> {unit}</small></strong>
            <span>today</span>
            <button type="button" className="hydros-orb__set" onClick={() => nav.go({ name: 'settings' })}>Choose a daily amount</button>
          </div>
        )}
        <div className="hydros-quick" aria-label="Log a drink">
          {glasses.map((glass) => (
            <button type="button" key={glass.id} onClick={() => void logDrink(glass, profiles, unit)}>
              <strong>{glass.label}</strong>
              <small>{volumeLabel(glass.amountOz, unit)}</small>
            </button>
          ))}
          {last && !sameAsGlass && (
            <button type="button" onClick={() => void logDrink({ profileId: last.profileId ?? last.kind, amountOz: last.amountOz }, profiles, unit)}>
              <strong>Same again</strong>
              <small>{last.label ?? 'Drink'} · {volumeLabel(last.amountOz, unit)}</small>
            </button>
          )}
        </div>
      </section>

      <section className="hydros-today-list" aria-label="Today’s drinks">
        <div className="hydros-section-title">
          <h2>Today</h2>
          {caffeine.mg > 0 && <span className="hydros-caffeine">{caffeine.mg} mg caffeine{caffeine.lastAt ? ` · last ${hourLabel(caffeine.lastAt)}` : ''}</span>}
        </div>
        {all && todays.length === 0 && <p className="pattern-empty">Nothing logged yet.</p>}
        {todays.map((drink) => <DrinkEntry key={drink.id} drink={drink} profiles={profiles} unit={unit} />)}
      </section>
    </div>
  );
}
