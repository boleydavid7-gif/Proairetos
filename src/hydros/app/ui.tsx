import type { ReactNode } from 'react';
import { BalanceIcon, ChartIcon, DropIcon, PlusIcon } from './icons';

export type Tab = 'today' | 'add' | 'flow' | 'balance';
const tabs: { id: Tab; label: string; Icon: (props: { size?: number }) => ReactNode }[] = [
  { id: 'today', label: 'Today', Icon: DropIcon },
  { id: 'add', label: 'Add', Icon: PlusIcon },
  { id: 'flow', label: 'Flow', Icon: ChartIcon },
  { id: 'balance', label: 'Balance', Icon: BalanceIcon },
];
export const tabNames = tabs.map((tab) => tab.id);

export function TabBar({ current, onPick }: { current: Tab | undefined; onPick: (tab: Tab) => void }) {
  return (
    <nav className="hydros-tabs" aria-label="Main">
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} type="button" className="hydros-tabs__item" aria-current={current === id ? 'page' : undefined} onClick={() => onPick(id)}>
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`hydros-brand${light ? ' hydros-brand--light' : ''}`}>
      <span className="hydros-brand__mark" aria-hidden="true"><span /><span /><span /></span>
      <span className="hydros-brand__words"><span className="hydros-brand__name">HYDROS</span><span className="hydros-brand__by">by Proairetos</span></span>
    </div>
  );
}

export function ScreenHeader({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  return <header className="hydros-header"><button type="button" className="hydros-icon-button" aria-label={onBack ? 'Back' : 'Close'} onClick={onBack}><span aria-hidden="true">{onBack ? '‹' : '×'}</span></button><h1>{title}</h1><span className="hydros-header__action">{action}</span></header>;
}

export function Segmented<T extends string>({ items, selected, onSelect }: { items: readonly T[]; selected: T; onSelect: (value: T) => void }) {
  return <div className="hydros-segmented" role="tablist">{items.map((item) => <button key={item} type="button" role="tab" aria-selected={selected === item} className={selected === item ? 'is-selected' : ''} onClick={() => onSelect(item)}>{item}</button>)}</div>;
}
