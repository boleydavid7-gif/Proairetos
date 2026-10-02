import type { Nav, Route } from '../app/App';
import { BoxIcon, ChevronIcon, GaugeIcon, GearIcon, HeartIcon, InfoIcon, Mark, ShieldIcon, TargetIcon } from '../app/icons';
import { scene } from '../app/scenes';
import { Brand } from '../app/ui';
import { levels, type Plan } from '../core/plans';
import type { ReactNode } from 'react';

export default function MorePage({ nav, plan }: { nav: Nav; plan?: Plan }) {
  const rows: { icon: ReactNode; title: string; detail: string; route: Route }[] = [
    {
      icon: <TargetIcon />,
      title: 'Your plan',
      detail: plan ? `${levels[plan.level].name} · ${plan.days} days a week` : 'Choose a plan',
      route: { name: 'plan' },
    },
    { icon: <HeartIcon />, title: 'Heart rate zones', detail: 'Optional numbers for each effort', route: { name: 'zones' } },
    { icon: <GaugeIcon />, title: 'Pace calculator', detail: 'Pace, time and distance', route: { name: 'pace' } },
    { icon: <ShieldIcon />, title: 'Before you start', detail: 'When to check with a doctor', route: { name: 'safety' } },
    { icon: <GearIcon />, title: 'Settings', detail: 'Units, voice, bells, screen', route: { name: 'settings' } },
    { icon: <BoxIcon />, title: 'Your data', detail: 'Back up, restore, delete', route: { name: 'data' } },
    { icon: <InfoIcon />, title: 'About and sources', detail: 'The name, the science', route: { name: 'about' } },
  ];
  return (
    <div className="page more">
      <Brand />
      <ul className="rows">
        {rows.map((row) => (
          <li key={row.title}>
            <button type="button" className="row" onClick={() => nav.go(row.route)}>
              <span className="row__icon">{row.icon}</span>
              <span className="row__text">
                <span>{row.title}</span>
                <span className="row__detail">{row.detail}</span>
              </span>
              <ChevronIcon size={18} />
            </button>
          </li>
        ))}
        <li>
          <a className="row" href="/">
            <span className="row__icon">
              <Mark size={24} />
            </span>
            <span className="row__text">
              <span>Proairetos</span>
              <span className="row__detail">Your days, your values, your reflections</span>
            </span>
            <ChevronIcon size={18} />
          </a>
        </li>
      </ul>
      <figure className="more__foot">
        <img src={scene('starry-valley')} alt="" />
        <figcaption>
          <blockquote>“No great thing comes into being all at once.”</blockquote>
          <span>Epictetus</span>
        </figcaption>
      </figure>
    </div>
  );
}
