import { useMemo } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings, useTraining } from '../app/state';
import { dateLabel, greeting, sameDay, totalOz } from '../core/drinks';
import { rangeForTraining } from '../data/training';
import { DropIcon, GearIcon, MoonIcon, PlusIcon, SunIcon, WaveIcon } from '../app/icons';
import { Brand } from '../app/ui';
import orbImage from '../../assets/images/scenes/hydros-orb.webp';

const quote = 'The health of the body is the foundation of the good life.';

export default function TodayPage({ nav }: { nav: Nav }) {
  const drinks = useDrinks() ?? [];
  const settings = useSettings();
  const training = useTraining();
  const today = useMemo(() => drinks.filter((drink) => sameDay(drink)), [drinks]);
  const hasData = drinks.length > 0;
  const amount = totalOz(today);
  const range = rangeForTraining(settings, training ?? { runDay: false, loggedRun: false });
  const goal = training?.runDay ? settings.goalOz + range.extra : settings.goalOz;
  const percent = Math.min(100, Math.round((amount / goal) * 100));
  const rangeText = hasData ? `${range.min} – ${range.max} oz` : 'Set amount';
  return (
    <div className="hydros-home">
      <section className="hydros-hero hydros-hero--today">
        <div className="hydros-home-head"><Brand light /><button type="button" className="hydros-settings-button" aria-label="Settings" onClick={() => nav.go({ name: 'settings' })}><GearIcon size={21} /></button></div>
        <div className="hydros-hero__words"><p>{greeting()}</p><h1>Drink with measure.</h1><span>{dateLabel()}</span></div>
        <div className="hydros-orb" aria-label={hasData ? `${amount} ounces of ${range.min} to ${range.max} ounces range` : 'Set amount'}><img className="hydros-orb__image" src={orbImage} alt="" /><div className="hydros-orb__water" style={{ height: `${Math.max(13, percent)}%` }} /><strong>{amount}<small> oz</small></strong><span>{hasData ? (training?.runDay ? 'run day range' : 'of your usual range') : 'Set amount'}</span><em>{rangeText}</em></div>
      </section>
      <section className="hydros-content">
        <div className="hydros-section-title"><h2>Today’s rhythm</h2><button type="button" onClick={() => nav.go({ name: 'add' })} aria-label="Add drink"><PlusIcon size={20} /></button></div>
        <div className="rhythm-card"><Rhythm icon={<SunIcon size={21} />} label="Morning" active={today.some((drink) => new Date(drink.loggedAt).getHours() < 12)} /><Rhythm icon={<WaveIcon size={22} />} label="Afternoon" active={today.some((drink) => { const hour = new Date(drink.loggedAt).getHours(); return hour >= 12 && hour < 18; })} /><Rhythm icon={<MoonIcon size={21} />} label="Evening" active={today.some((drink) => new Date(drink.loggedAt).getHours() >= 18)} /></div>
        <div className="hydros-note"><DropIcon size={24} /><span>{!hasData ? 'Set amount.' : training?.runDay ? `Run day · ${range.extra} oz added to your range.` : amount < range.min ? 'A little below your usual range.' : amount > range.max ? 'Above your usual range.' : 'Within your usual range.'}</span></div>
        <blockquote className="hydros-quote">“{quote}”<cite>— Galen</cite></blockquote>
      </section>
    </div>
  );
}

function Rhythm({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return <div className={active ? 'rhythm-card__item is-active' : 'rhythm-card__item'}>{icon}<span>{label}</span><small>{active ? 'On track' : 'Open'}</small></div>;
}
