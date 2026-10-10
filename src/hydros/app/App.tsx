import { useCallback, useEffect, useRef, useState } from 'react';
import { directionAlong, transition, type Direction } from '../../app/transitions';
import { tabNames, TabBar, type Tab } from './ui';
import TodayPage from '../screens/TodayPage';
import AddPage from '../screens/AddPage';
import FlowPage from '../screens/FlowPage';
import DrinkTypesPage from '../screens/DrinkTypesPage';
import SettingsPage from '../screens/SettingsPage';

export type Route = { name: 'today' | 'flow' } | { name: 'add'; profileId?: string } | { name: 'drinkTypes'; returnTo?: 'add' } | { name: 'settings' };
export type Nav = { go: (route: Route) => void; swap: (route: Route) => void; back: () => void };
const isTab = (name: Route['name']): name is Tab => (tabNames as string[]).includes(name);

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'today' });
  const [lastTab, setLastTab] = useState<Tab>('today');
  useEffect(() => {
    history.replaceState({ hydros: route }, '');
    const onPop = (event: PopStateEvent) => transition('back', () => setRoute((event.state as { hydros?: Route } | null)?.hydros ?? { name: 'today' }));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => { if (isTab(route.name)) setLastTab(route.name); window.scrollTo(0, 0); }, [route]);
  const current = useRef(route); current.current = route;
  const directionTo = (next: Route): Direction => isTab(current.current.name) && isTab(next.name) ? directionAlong(tabNames, current.current.name, next.name) : 'forward';
  const go = useCallback((next: Route) => { history.pushState({ hydros: next }, ''); transition(directionTo(next), () => setRoute(next)); }, []);
  const swap = useCallback((next: Route) => { history.replaceState({ hydros: next }, ''); transition(directionTo(next), () => setRoute(next)); }, []);
  const back = useCallback(() => history.length > 1 ? history.back() : swap({ name: lastTab }), [lastTab, swap]);
  const nav: Nav = { go, swap, back };
  const page = route.name === 'today' ? <TodayPage nav={nav} /> : route.name === 'add' ? <AddPage nav={nav} profileId={route.profileId} /> : route.name === 'flow' ? <FlowPage nav={nav} /> : route.name === 'drinkTypes' ? <DrinkTypesPage nav={nav} returnTo={route.returnTo} /> : route.name === 'settings' ? <SettingsPage nav={nav} /> : <TodayPage nav={nav} />;
  return <div className="hydros-shell"><main key={route.name} className="hydros-page-enter">{page}</main><TabBar current={isTab(route.name) ? route.name : undefined} onPick={(tab) => swap({ name: tab })} /></div>;
}
