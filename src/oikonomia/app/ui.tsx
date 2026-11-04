import type { ReactNode } from 'react';
import ProairetosTab from '../../app/family/ProairetosTab';
import DesktopAppLinks from '../../app/family/DesktopAppLinks';
import heroWide from '../../assets/images/scenes/oikonomia-stoic-wide.webp';
import { ArchMark, BillsIcon, CalendarIcon, HomeIcon, SettingsIcon, WalletIcon } from './icons';

export type Tab = 'today' | 'bills' | 'plan' | 'calendar' | 'more';

const tabs: { id: Tab; label: string; Icon: (props: { size?: number }) => ReactNode }[] = [
  { id: 'today', label: 'Today', Icon: HomeIcon },
  { id: 'bills', label: 'Bills', Icon: BillsIcon },
  { id: 'plan', label: 'Plan', Icon: WalletIcon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'more', label: 'More', Icon: SettingsIcon },
];

export const tabNames = tabs.map((tab) => tab.id);

export function TabBar({ current, onPick }: { current: Tab | undefined; onPick: (tab: Tab) => void }) {
  return (
    <nav className="tab-bar" aria-label="Main">
      <DesktopAppLinks />
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} type="button" className="tab-bar__item" data-to-header={['more', 'settings'].includes(id) ? '' : undefined} aria-current={current === id ? 'page' : undefined} onClick={() => onPick(id)}>
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
      <ProairetosTab />
    </nav>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={'brand' + (light ? ' brand--light' : '')}>
      <ArchMark size={30} light={light} />
      <span className="brand__words">
        <span className="brand__name">Oikonomia</span>
      </span>
    </div>
  );
}

export function Hero({ children }: { children: ReactNode }) {
  return (
    <div className="hero hero--tall oiko-hero">
      <img className="hero__image" src={heroWide} alt="" fetchPriority="high" decoding="async" />
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
