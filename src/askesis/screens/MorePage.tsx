import type { Nav, Route } from '../app/App';
import { HistoryIcon } from '../../app/family/icons';
import { BoxIcon, PulseIcon, SoundIcon, ChevronIcon, GaugeIcon, GearIcon, HeartIcon, InfoIcon, ShieldIcon, TargetIcon, TrainIcon } from '../app/icons';
import { Brand } from '../app/ui';
import { useSettings } from '../app/state';
import { stravaLink } from '../app/strava';
import AccountCard from '../../app/family/AccountCard';
import FamilyApps from '../../app/family/FamilyApps';
import { aimWords, type Plan } from '../core/plans';
import type { ReactNode } from 'react';

type MoreRow = { icon: ReactNode; title: string; detail: string; route?: Route; href?: string };

export default function MorePage({ nav, plan }: { nav: Nav; plan?: Plan }) {
  const settings = useSettings();
  const stravaOn = Boolean(stravaLink()?.refresh);
  const groups: { label: string; rows: MoreRow[] }[] = [
    {
      label: 'Your plan',
      rows: [
        {
          icon: <TargetIcon />,
          title: 'Your aim',
          detail: plan ? `${aimWords(plan.aim)} · ${plan.days} days a week` : '',
          route: { name: 'plan' },
        },
        { icon: <HistoryIcon size={22} />, title: 'Your year', detail: '', route: { name: 'year' } },
      ],
    },
    {
      label: 'Tools',
      rows: [
        { icon: <HeartIcon />, title: 'Heart rate zones', detail: '', route: { name: 'zones' } },
        { icon: <GaugeIcon />, title: 'Pace calculator', detail: '', route: { name: 'pace' } },
        { icon: <TrainIcon />, title: 'Running shoes', detail: 'Mileage by pair', route: { name: 'shoes' } },
        {
          icon: <SoundIcon />,
          title: 'Music',
          detail: settings.music === 'mine' ? 'Songs here' : settings.music === 'other' ? 'Another app' : '',
          route: { name: 'music' },
        },
      ],
    },
    {
      label: 'Bringing workouts in',
      rows: [
        { icon: <PulseIcon />, title: 'Health data', detail: '', href: '/?open=settings:health' },
        ...(stravaOn ? [{ icon: <PulseIcon />, title: 'Strava', detail: 'Connected', route: { name: 'strava' } as Route }] : []),
      ],
    },
    {
      label: 'The app',
      rows: [
        { icon: <GearIcon />, title: 'Settings', detail: '', route: { name: 'settings' } },
        { icon: <BoxIcon />, title: 'Your data', detail: '', route: { name: 'data' } },
        { icon: <ShieldIcon />, title: 'Before you start', detail: '', route: { name: 'safety' } },
        { icon: <InfoIcon />, title: 'About and sources', detail: '', route: { name: 'about' } },
      ],
    },
  ];
  return (
    <div className="page more">
      <Brand />
      <AccountCard app="Askesis" what="Your plan and workouts" waiting="Workouts" />
      {groups.map((group) => (
        <section key={group.label}>
          <p className="ll-section-label">{group.label}</p>
          <ul className="rows">
            {group.rows.map((row) => {
              const body = (
                <>
                  <span className="row__icon">{row.icon}</span>
                  <span className="row__text">
                    <span>{row.title}</span>
                    {row.detail && <span className="row__detail">{row.detail}</span>}
                  </span>
                  <ChevronIcon size={18} />
                </>
              );
              return (
                <li key={row.title}>
                  {row.href ? (
                    <a className="row" href={row.href}>
                      {body}
                    </a>
                  ) : (
                    <button type="button" className="row" onClick={() => nav.go(row.route!)}>
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
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
