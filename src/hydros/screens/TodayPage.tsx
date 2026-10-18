import { useMemo, type CSSProperties } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings, useTraining } from '../app/state';
import { useDays, useNow } from '../app/day';
import { logDrink } from '../app/log';
import DrinkEntry from '../app/DrinkEntry';
import { caffeineFacts, dateLabel, defaultDrinkProfiles, effectiveGoalOz, formatVolume, hourLabel, hydrationOz, localDate, unitToOunces, volumeLabel, type HydrosUnit } from '../core/drinks';
import { rangeForTraining } from '../data/training';
import { hydrosQuoteFor } from '../core/quotes';
import { GearIcon, PlusIcon } from '../app/icons';
import { Brand } from '../app/ui';
import IconButton from '../../components/ui/IconButton';

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
  const remaining = Math.max(0, goal - amount);
  const quote = hydrosQuoteFor(today);
  const caffeine = caffeineFacts(todays);
  const last = drinks[0];
  const glasses = settings.glasses ?? [];
  const sameAsGlass = last && glasses.some((glass) => glass.profileId === last.profileId && Math.abs(glass.amountOz - last.amountOz) < 0.05);
  const history = useMemo(() => profiles
    .filter((profile) => profile.id.startsWith('custom-'))
    .map((profile) => ({ profile, last: drinks.find((drink) => drink.profileId === profile.id) }))
    .filter(({ last }) => Boolean(last)), [drinks, profiles]);

  return (
    <div className="hydros-home">
      <section className="hydros-hero hydros-hero--today">
        <div className="hydros-home-head">
          <Brand light />
          <IconButton className="hydros-settings-button" data-to-header="" label="Settings" onClick={() => nav.go({ name: 'settings' })}>
            <GearIcon size={22} />
          </IconButton>
        </div>
        <div className="hydros-hero__words">
          <p>Today</p>
          <span>{dateLabel(now)}</span>
        </div>
      </section>

      <section className="hydros-home__content">
        {settings.goalChosen ? (
          <article className="hydros-goal-card" aria-label={`${formatVolume(amount, unit)} of ${formatVolume(goal, unit)} ${unit}`}>
            <div className="hydros-goal-ring" style={{ '--hydros-progress': `${percent}%` } as CSSProperties}>
              <div className="hydros-goal-ring__inner"><strong>{formatVolume(amount, unit)}</strong><span>of {formatVolume(goal, unit)} {unit}</span></div>
            </div>
            <div className="hydros-goal-card__stats">
              <span className="hydros-eyebrow">Daily goal</span>
              <strong>{Math.round(percent)}% complete</strong>
              <span>{remaining > 0 ? `${formatVolume(remaining, unit)} remaining` : 'Daily amount reached'}</span>
              {extra > 0 && <small>{volumeLabel(extra, unit)} added for {range.extra && training?.loggedRun ? 'today’s run' : 'a run day'}</small>}
            </div>
          </article>
        ) : (
          <article className="hydros-goal-card hydros-goal-card--empty">
            <div className="hydros-goal-card__stats"><span className="hydros-eyebrow">Daily goal</span><strong>{formatVolume(amount, unit)} logged today</strong><span>Choose an amount to see what remains.</span><button type="button" className="hydros-inline-action" onClick={() => nav.go({ name: 'settings' })}>Choose a daily amount</button></div>
          </article>
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

      {history.length > 0 && (
        <section className="hydros-history" aria-label="History">
          <div className="hydros-section-title"><h2>History</h2></div>
          <div className="hydros-history__items">
            {history.map(({ profile, last: previous }) => (
              <button type="button" key={profile.id} onClick={() => void logDrink({ profileId: profile.id, amountOz: previous?.amountOz ?? unitToOunces(12, unit) }, profiles, unit)}>
                <strong>{profile.label}</strong>
                <small>{volumeLabel(previous?.amountOz ?? unitToOunces(12, unit), unit)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="hydros-today-list" aria-label="Today’s drinks">
        <div className="hydros-section-title">
          <h2>Today</h2>
          <button type="button" aria-label="Add a custom drink" onClick={() => nav.go({ name: 'add', custom: true })}><PlusIcon size={20} /></button>
          {caffeine.mg > 0 && <span className="hydros-caffeine">{caffeine.mg} mg caffeine{caffeine.lastAt ? ` · last ${hourLabel(caffeine.lastAt)}` : ''}</span>}
        </div>
        {all && todays.length === 0 && <p className="pattern-empty">Nothing logged yet.</p>}
        {todays.map((drink) => <DrinkEntry key={drink.id} drink={drink} profiles={profiles} unit={unit} />)}
      </section>

      <section className="hydros-insights" aria-label="Hydration insights">
        <article className="hydros-insight-card hydros-insight-card--quote"><span className="hydros-eyebrow">A line for today</span><p>“{quote.text}”</p><small>— {quote.source}</small></article>
        {caffeine.mg > 0 && <article className="hydros-insight-card"><span className="hydros-eyebrow">Caffeine today</span><strong>{caffeine.mg} mg</strong><small>{caffeine.lastAt ? `Last at ${hourLabel(caffeine.lastAt)}` : 'From what you logged'}</small></article>}
      </section>
      </section>
    </div>
  );
}
