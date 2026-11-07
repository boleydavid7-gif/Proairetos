import { useCallback, useEffect, useRef, useState } from 'react';
import { directionAlong, transition, type Direction } from '../../app/transitions';
import { tabNames, TabBar, type Tab } from './ui';
import TodayPage from '../screens/TodayPage';
import AddPage from '../screens/AddPage';
import FlowPage from '../screens/FlowPage';
import DrinkTypesPage from '../screens/DrinkTypesPage';
import SettingsPage from '../screens/SettingsPage';
import { UndoToast } from './undo';
import { takeOpening } from '../../app/family/opening';
import { loadSettings } from '../data/store';
import { defaultDrinkProfiles } from '../core/drinks';
import { logDrink } from './log';
import PwaStatus from '../../app/pwa/PwaStatus';

/** Where a link or shortcut asks to begin: `glass` (log the first usual glass), `add`, `custom`, `add:TYPE`, `flow`, `settings`. */
function opening(): Route {
  const open = takeOpening();
  if (open === 'glass') {
    const settings = loadSettings();
    const glass = settings.glasses?.[0];
    if (glass) void logDrink(glass, settings.drinkProfiles?.length ? settings.drinkProfiles : defaultDrinkProfiles(), settings.unit ?? 'oz');
    return { name: 'today' };
  }
  if (open === 'add') return { name: 'add' };
  if (open === 'custom') return { name: 'add', custom: true };
  if (open?.startsWith('add:')) return { name: 'add', profileId: open.slice(4) };
  if (open === 'flow') return { name: 'flow' };
  if (open === 'settings') return { name: 'settings' };
  return { name: 'today' };
}

export type Route = { name: 'today' | 'flow' } | { name: 'add'; profileId?: string; custom?: boolean } | { name: 'drinkTypes'; returnTo?: 'add' } | { name: 'settings' };
export type Nav = { go: (route: Route) => void; swap: (route: Route) => void; back: () => void };
const isTab = (name: Route['name']): name is Tab => (tabNames as string[]).includes(name);

export default function App() {
  const [route, setRoute] = useState<Route>(opening);
  const routeHistory = useRef<Route[]>([]);
  if (routeHistory.current.length === 0) routeHistory.current.push(route);
  const [lastTab, setLastTab] = useState<Tab>('today');
  useEffect(() => {
    history.replaceState({ hydros: route }, '');
    const onPop = (event: PopStateEvent) => {
      const next = (event.state as { hydros?: Route } | null)?.hydros;
      // A direct app entry can have another site before it. Do not let browser back leave Hydros.
      if (!next) {
        history.forward();
        return;
      }
      routeHistory.current = routeHistory.current.length > 1 ? routeHistory.current.slice(0, -1) : [next];
      transition('back', () => setRoute(next));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => { if (isTab(route.name)) setLastTab(route.name); window.scrollTo(0, 0); }, [route]);
  const current = useRef(route); current.current = route;
  const directionTo = (next: Route): Direction => isTab(current.current.name) && isTab(next.name) ? directionAlong(tabNames, current.current.name, next.name) : 'forward';
  const go = useCallback((next: Route) => {
    routeHistory.current.push(next);
    history.pushState({ hydros: next }, '');
    transition(directionTo(next), () => setRoute(next));
  }, []);
  const swap = useCallback((next: Route) => {
    routeHistory.current[routeHistory.current.length - 1] = next;
    history.replaceState({ hydros: next }, '');
    transition(directionTo(next), () => setRoute(next));
  }, []);
  const back = useCallback(() => {
    if (routeHistory.current.length > 1) {
      routeHistory.current.pop();
      const previous = routeHistory.current[routeHistory.current.length - 1];
      history.replaceState({ hydros: previous }, '');
      transition('back', () => setRoute(previous));
      return;
    }
    swap({ name: lastTab });
  }, [lastTab, swap]);
  const nav: Nav = { go, swap, back };
  const page = route.name === 'today' ? <TodayPage nav={nav} /> : route.name === 'add' ? <AddPage nav={nav} profileId={route.profileId} custom={route.custom} /> : route.name === 'flow' ? <FlowPage nav={nav} /> : route.name === 'drinkTypes' ? <DrinkTypesPage nav={nav} returnTo={route.returnTo} /> : route.name === 'settings' ? <SettingsPage nav={nav} /> : <TodayPage nav={nav} />;
  return <div className="hydros-shell"><PwaStatus /><main key={route.name} className="hydros-page-enter">{page}</main><UndoToast /><TabBar current={isTab(route.name) ? route.name : undefined} onPick={(tab) => swap({ name: tab })} /></div>;
}
