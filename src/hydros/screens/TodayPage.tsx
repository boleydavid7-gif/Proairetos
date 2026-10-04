import { useMemo } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings } from '../app/state';
import { dateLabel, greeting, sameDay, totalOz } from '../core/drinks';
import { DropIcon, MoonIcon, PlusIcon, SunIcon, WaveIcon } from '../app/icons';
import { Brand } from '../app/ui';

const quote = 'The health of the body is the foundation of the good life.';

export default function TodayPage({ nav }: { nav: Nav }) {
  const drinks = useDrinks() ?? [];
  const settings = useSettings();
  const today = useMemo(() => drinks.filter((drink) => sameDay(drink)), [drinks]);
  const amount = totalOz(today);
  const percent = Math.min(100, Math.round((amount / settings.goalOz) * 100));
  return (
    <div className="hydros-home">
      <section className="hydros-hero hydros-hero--today">
        <Brand light />
        <div className="hydros-hero__words"><p>{greeting()}</p><h1>Notice your rhythm.</h1><span>{dateLabel()}</span></div>
        <div className="hydros-orb" aria-label={`${amount} ounces of ${settings.usualMinOz} to ${settings.usualMaxOz} ounces usual range`}><div className="hydros-orb__water" style={{ height: `${Math.max(13, percent)}%` }} /><strong>{amount}<small> oz</small></strong><span>of your usual range</span><em>{settings.usualMinOz} – {settings.usualMaxOz} oz</em></div>
      </section>
      <section className="hydros-content">
        <div className="hydros-section-title"><h2>Today’s rhythm</h2><button type="button" onClick={() => nav.go({ name: 'add' })} aria-label="Add drink"><PlusIcon size={20} /></button></div>
        <div className="rhythm-card"><Rhythm icon={<SunIcon size={21} />} label="Morning" active={today.some((drink) => new Date(drink.loggedAt).getHours() < 12)} /><Rhythm icon={<WaveIcon size={22} />} label="Afternoon" active={today.some((drink) => { const hour = new Date(drink.loggedAt).getHours(); return hour >= 12 && hour < 18; })} /><Rhythm icon={<MoonIcon size={21} />} label="Evening" active={today.some((drink) => new Date(drink.loggedAt).getHours() >= 18)} /></div>
        <div className="hydros-note"><DropIcon size={24} /><span>{amount < settings.usualMinOz ? 'A little below your usual range.' : amount > settings.usualMaxOz ? 'Above your usual range.' : 'Within your usual range.'}</span></div>
        <blockquote className="hydros-quote">“{quote}”<cite>— Galen</cite></blockquote>
      </section>
    </div>
  );
}

function Rhythm({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return <div className={active ? 'rhythm-card__item is-active' : 'rhythm-card__item'}>{icon}<span>{label}</span><small>{active ? 'On track' : 'Open'}</small></div>;
}
