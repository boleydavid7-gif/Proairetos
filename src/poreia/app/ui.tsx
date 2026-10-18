import type { ReactNode } from 'react';
import ProairetosTab from '../../app/family/ProairetosTab';
import { ArrowLeftIcon, CalendarIcon, DiscoverIcon, HomeIcon, MoreIcon, PoreiaMark, TripsIcon } from './icons';

export type Tab = 'home' | 'trips' | 'calendar' | 'discover' | 'more';

const tabs: { id: Tab; label: string; Icon: (props: { size?: number }) => ReactNode }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'trips', label: 'Trips', Icon: TripsIcon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'discover', label: 'Discover', Icon: DiscoverIcon },
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
      <ProairetosTab />
    </nav>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand${light ? ' brand--light' : ''}`}>
      <PoreiaMark size={30} light={light} />
      <span className="brand__words"><span className="brand__name">Poreia</span></span>
    </div>
  );
}

export function PageTop({ children }: { children: ReactNode }) {
  return <div className="page-top">{children}</div>;
}

export function BackLink({ onBack }: { onBack: () => void }) {
  return <button type="button" className="back-link" onClick={onBack}><ArrowLeftIcon size={20} /> Back</button>;
}

export function PoreiaHeader({ eyebrow, title, description, compact = false, children }: { eyebrow?: string; title: string; description?: string; compact?: boolean; children?: ReactNode }) {
  return (
    <header className={`poreia-header${compact ? ' poreia-header--compact' : ''}`}>
      <Brand />
      <div className="poreia-header__words">
        {eyebrow && <p className="label">{eyebrow}</p>}
        <h1 className="poreia-header__title">{title}</h1>
        {description && <p className="poreia-header__description">{description}</p>}
      </div>
      {children}
    </header>
  );
}
