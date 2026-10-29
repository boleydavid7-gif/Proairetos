import type { Nav, Route } from '../app/App';
import { HistoryIcon } from '../../app/family/icons';
import { BoxIcon, PulseIcon, SoundIcon, ChevronIcon, GaugeIcon, GearIcon, HeartIcon, InfoIcon, ShieldIcon, TargetIcon } from '../app/icons';
import { Brand } from '../app/ui';
import { useSettings } from '../app/state';
import { stravaLink } from '../app/strava';
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
      detail: plan ? `${aimWords(plan.aim)} · ${plan.days} days a week` : '',
      route: { name: 'plan' },
    },
    {
      icon: <SoundIcon />,
      title: 'Music',
      detail: settings.music === 'mine' ? 'Songs here' : settings.music === 'other' ? 'Another app' : '',
      route: { name: 'music' },
    },
    { icon: <PulseIcon />, title: 'Strava', detail: stravaLink()?.refresh ? 'Connected' : '', route: { name: 'strava' } },
    { icon: <HeartIcon />, title: 'Heart rate zones', detail: '', route: { name: 'zones' } },
    { icon: <GaugeIcon />, title: 'Pace calculator', detail: '', route: { name: 'pace' } },
    { icon: <ShieldIcon />, title: 'Before you start', detail: '', route: { name: 'safety' } },
    { icon: <HistoryIcon size={22} />, title: 'Your year', detail: '', route: { name: 'year' } },
    { icon: <GearIcon />, title: 'Settings', detail: '', route: { name: 'settings' } },
    { icon: <BoxIcon />, title: 'Your data', detail: '', route: { name: 'data' } },
    { icon: <InfoIcon />, title: 'About and sources', detail: '', route: { name: 'about' } },
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
                {row.detail && <span className="row__detail">{row.detail}</span>}
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
