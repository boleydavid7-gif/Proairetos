import { useMemo, type CSSProperties } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings, useTraining } from '../app/state';
import { useDays, useNow } from '../app/day';
import { logDrink } from '../app/log';
import DrinkEntry from '../app/DrinkEntry';
import { caffeineFacts, dateLabel, defaultDrinkProfiles, effectiveGoalOz, formatVolume, hourLabel, hydrationOz, localDate, unitToOunces, volumeLabel, type HydrosUnit } from '../core/drinks';
import { rangeForTraining } from '../data/training';
import { hydrosQuoteFor } from '../core/quotes';
import { DropIcon, GearIcon, PlusIcon } from '../app/icons';
import { Brand } from '../app/ui';
import IconButton from '../../components/ui/IconButton';
import sceneWide from '../../assets/images/scenes/hydros-stoic-wide.webp';
import { RollingNumber } from '../../lamplight/RollingNumber';

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
      <header className="hero hero--tall hydros-home-hero">
        <picture>
          <source media="(min-width: 62rem)" srcSet={sceneWide} />
          <img className="hero__image" src={sceneWide} alt="" fetchPriority="high" decoding="async" />
        </picture>
        <div className="hero__shade" />
        <div className="hero__content">
          <div className="hydros-home-head">
            <Brand light />
            <IconButton className="hydros-settings-button" data-to-header="" label="Settings" onClick={() => nav.go({ name: 'settings' })}>
              <GearIcon size={22} />
            </IconButton>
          </div>
          <div className="home__words">
            <h1 className="home__title">Today</h1>
            <p className="home__sub">{dateLabel(now)}</p>
          </div>
        </div>
      </header>

      <section className="hydros-home__content">
        <article
          className="hydros-amount"
          aria-label={settings.goalChosen
            ? formatVolume(amount, unit) + ' of ' + formatVolume(goal, unit) + ' ' + unit
            : formatVolume(amount, unit) + ' ' + unit + ' today'}
        >
          <div className="hydros-amount__overview">
            <div
              className="hydros-amount__ring"
              style={{ '--hydros-progress': (settings.goalChosen ? percent : 0) + '%' } as CSSProperties}
              role="img"
              aria-label={settings.goalChosen ? Math.round(percent) + ' percent of daily hydration goal' : 'Daily goal not set'}
            >
              <div className="hydros-amount__ring-center">
                <strong><RollingNumber value={amount} format={(n) => formatVolume(n, unit) + ' ' + unit} /></strong>
                <span>{settings.goalChosen ? 'of ' + formatVolume(goal, unit) + ' ' + unit : 'today'}</span>
              </div>
            </div>

            <div className="hydros-amount__stats">
              {settings.goalChosen ? (
                <>
                  <span className="hydros-eyebrow">Daily hydration</span>
                  <strong className="hydros-amount__percent">{Math.round(percent)}%</strong>
                  <span className="hydros-amount__remaining">
                    <DropIcon size={18} />
                    {remaining > 0 ? formatVolume(remaining, unit) + ' ' + unit + ' remaining' : 'Daily goal reached'}
                  </span>
                  {extra > 0 && (
                    <p className="hydros-amount__note">
                      {volumeLabel(extra, unit)} added for {range.extra && training?.loggedRun ? 'today’s run' : 'a run day'}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <span className="hydros-eyebrow">Daily goal</span>
                  <strong className="hydros-amount__percent">Not set</strong>
                  <button type="button" className="button-quiet button--sm" onClick={() => nav.go({ name: 'settings' })}>
                    Set goal
                  </button>
                </>
              )}
            </div>
          </div>

          <button type="button" className="button-main button--lg hydros-amount__action" onClick={() => nav.go({ name: 'add' })}>
            <DropIcon size={20} />
            Log a drink
          </button>
        </article>

        {(glasses.length > 0 || (last && !sameAsGlass)) && (
          <section className="hydros-quick-log" aria-label="Quick log">
            <div className="hydros-section-title"><h2>Quick log</h2></div>
            <div className="hydros-glasses">
              {glasses.map((glass) => (
                <button type="button" key={glass.id} className="hydros-glass" onClick={() => void logDrink(glass, profiles, unit)}>
                  <PlusIcon size={18} />
                  <span><strong>{glass.label}</strong><small>{volumeLabel(glass.amountOz, unit)}</small></span>
                </button>
              ))}
              {last && !sameAsGlass && (
                <button type="button" className="hydros-glass" onClick={() => void logDrink({ profileId: last.profileId ?? last.kind, amountOz: last.amountOz }, profiles, unit)}>
                  <PlusIcon size={18} />
                  <span><strong>Same again</strong><small>{last.label ?? 'Drink'} · {volumeLabel(last.amountOz, unit)}</small></span>
                </button>
              )}
            </div>
          </section>
        )}

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
          <h2>Drinks</h2>
          <button type="button" aria-label="Add a custom drink" onClick={() => nav.go({ name: 'add', custom: true })}><PlusIcon size={20} /></button>
        </div>
        {caffeine.mg > 0 && <p className="hydros-caffeine">{caffeine.mg} mg caffeine{caffeine.lastAt ? ` · last at ${hourLabel(caffeine.lastAt)}` : ''}</p>}
        {all && todays.length === 0 && <p className="pattern-empty">Nothing logged yet.</p>}
        {todays.length > 0 && (
          <div className="hydros-drinks">
            {todays.map((drink) => <DrinkEntry key={drink.id} drink={drink} profiles={profiles} unit={unit} />)}
          </div>
        )}
      </section>

      {todays.length > 0 && (
        <footer className="hydros-thought">
          <p>“{quote.text}”</p>
          <small>{quote.source}</small>
        </footer>
      )}
      </section>
    </div>
  );
}
