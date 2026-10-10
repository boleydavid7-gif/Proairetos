import type { ReactNode } from 'react';
import heroImage from '../../assets/images/scenes/valley.webp';
import heroWide from '../../assets/images/scenes/valley-wide.webp';
import { ArchMark, BillsIcon, CalendarIcon, HomeIcon, MoreIcon, PlusIcon } from './icons';

export type Tab = 'today' | 'bills' | 'calendar' | 'capture' | 'more';

const tabs: { id: Tab; label: string; Icon: (props: { size?: number }) => ReactNode }[] = [
  { id: 'today', label: 'Today', Icon: HomeIcon },
  { id: 'bills', label: 'Bills', Icon: BillsIcon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'capture', label: 'Capture', Icon: PlusIcon },
  { id: 'more', label: 'More', Icon: MoreIcon },
];

export const tabNames = tabs.map((tab) => tab.id);

export function TabBar({ current, onPick }: { current: Tab | undefined; onPick: (tab: Tab) => void }) {
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} type="button" className="tab-bar__item" aria-current={current === id ? 'page' : undefined} onClick={() => onPick(id)}>
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={'brand' + (light ? ' brand--light' : '')}>
      <ArchMark size={30} light={light} />
      <span className="brand__words">
        <span className="brand__name">OIKONOMIA</span>
        <span className="brand__by">by Proairetos</span>
      </span>
    </div>
  );
}

export function Hero({ children }: { children: ReactNode }) {
  return (
    <div className="hero hero--tall oiko-hero">
      <picture>
        <source media="(min-width: 62rem)" srcSet={heroWide} />
        <img className="hero__image" src={heroImage} alt="" />
      </picture>
      <div className="hero__shade" />
      <div className="hero__content">{children}</div>
    </div>
  );
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatFrequency(frequency: string): string {
  if (frequency === 'once') return 'One time';
  return frequency.charAt(0).toUpperCase() + frequency.slice(1);
}

export function PageTop({ children }: { children: ReactNode }) {
  return <div className="page-top">{children}</div>;
}
