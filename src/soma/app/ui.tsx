import type { ReactNode } from 'react';
import { BookIcon, BasketIcon, HomeIcon, Leaf, MoreIcon, SproutIcon } from './icons';

export { BackLink, Hero, Segmented, Switch, UndoProvider, useUndo, greeting, dayLabel } from '../../askesis/app/ui';

export type Tab = 'home' | 'recipes' | 'ideas' | 'groceries' | 'more';

const tabs: { id: Tab; label: string; Icon: (p: { size?: number }) => ReactNode }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'recipes', label: 'Recipes', Icon: BookIcon },
  { id: 'ideas', label: 'Ideas', Icon: SproutIcon },
  { id: 'groceries', label: 'Groceries', Icon: BasketIcon },
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
    <div className={`brand${light ? ' brand--light' : ''}`}>
      <Leaf size={30} />
      <span className="brand__words">
        <span className="brand__name">SOMA</span>
        <span className="brand__by">by Proairetos</span>
      </span>
    </div>
  );
}
