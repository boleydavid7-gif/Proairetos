import type { Nav, Route } from '../app/App';
import { BoxIcon, SoundIcon, ChevronIcon, GaugeIcon, GearIcon, HeartIcon, InfoIcon, ShieldIcon, TargetIcon } from '../app/icons';
import { Brand } from '../app/ui';
import { useSettings } from '../app/state';
import AccountCard from '../../app/family/AccountCard';
import FamilyApps from '../../app/family/FamilyApps';
import { aimWords, type Plan } from '../core/plans';
import type { ReactNode } from 'react';

export default function MorePage({ nav, plan }: { nav: Nav; plan?: Plan }) {
  const settings = useSettings();
  const rows: { icon: ReactNode; title: string; detail: string; route: Route }[] = [
    {
      icon: <TargetIcon />,
      title: 'Your aim',
      detail: plan ? `${aimWords(plan.aim)} · ${plan.days} days a week` : 'Set your aim',
      route: { name: 'plan' },
    },
    {
      icon: <SoundIcon />,
      title: 'Music',
      detail: settings.music === 'mine' ? 'Songs here' : settings.music === 'other' ? 'Another app' : 'Songs for your sessions',
      route: { name: 'music' },
    },
    { icon: <HeartIcon />, title: 'Heart rate zones', detail: 'Set zones for each effort', route: { name: 'zones' } },
    { icon: <GaugeIcon />, title: 'Pace calculator', detail: 'Pace, time and distance', route: { name: 'pace' } },
    { icon: <ShieldIcon />, title: 'Before you start', detail: 'When to check with a doctor', route: { name: 'safety' } },
    { icon: <GearIcon />, title: 'Settings', detail: 'Units, voice, bells, screen', route: { name: 'settings' } },
    { icon: <BoxIcon />, title: 'Your data', detail: 'Back up, restore, delete', route: { name: 'data' } },
    { icon: <InfoIcon />, title: 'About and sources', detail: 'The name, the science', route: { name: 'about' } },
  ];
  return (
    <div className="page more">
      <Brand />
      <AccountCard app="Askesis" what="Your plan and workouts" waiting="Workouts" />
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
      </ul>
      <FamilyApps current="askesis" />
      <figure className="more__foot">
        <figcaption>
          <blockquote>“No great thing comes into being all at once.”</blockquote>
          <span>Epictetus</span>
        </figcaption>
      </figure>
    </div>
  );
}
