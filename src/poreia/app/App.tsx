import { useCallback, useEffect, useRef, useState } from 'react';
import { startSync } from '../../app/sync/syncController';
import { directionAlong, transition, type Direction } from '../../app/transitions';
import { TabBar, tabNames, type Tab } from './ui';
import { startStore } from '../data/store';
import HomePage from '../screens/HomePage';
import TripsPage from '../screens/TripsPage';
import CalendarPage from '../screens/CalendarPage';
import PtoPage from '../screens/PtoPage';
import DiscoverPage from '../screens/DiscoverPage';
import WelcomePage from '../screens/WelcomePage';

export type Route = { name: 'welcome' } | { name: Tab };
export type Nav = { go: (route: Route) => void; swap: (route: Route) => void; back: () => void };
const isTab = (name: Route['name']): name is Tab => (tabNames as string[]).includes(name);

export default function App() {
  const [started, setStarted] = useState(() => localStorage.getItem('poreia:started') === 'yes');
  const [route, setRoute] = useState<Route>(() => (started ? { name: 'home' } : { name: 'welcome' }));
  const [lastTab, setLastTab] = useState<Tab>('home');

  useEffect(() => {
    history.replaceState({ poreia: route }, '');
    const onPop = (event: PopStateEvent) => transition('back', () => setRoute((event.state as { poreia?: Route } | null)?.poreia ?? { name: 'home' }));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (isTab(route.name)) setLastTab(route.name);
    window.scrollTo(0, 0);
  }, [route]);

  useEffect(() => {
    void startStore().then(() => startSync()).catch(() => undefined);
  }, []);

  const current = useRef(route);
  current.current = route;
  const directionTo = (next: Route): Direction => isTab(current.current.name) && isTab(next.name) ? directionAlong(tabNames, current.current.name, next.name) : 'forward';
  const go = useCallback((next: Route) => { history.pushState({ poreia: next }, ''); transition(directionTo(next), () => setRoute(next)); }, []);
  const swap = useCallback((next: Route) => { history.replaceState({ poreia: next }, ''); transition(directionTo(next), () => setRoute(next)); }, []);
  const back = useCallback(() => history.length > 1 ? history.back() : swap({ name: lastTab }), [lastTab, swap]);
  const nav: Nav = { go, swap, back };

  if (route.name === 'welcome') return <WelcomePage nav={nav} onStarted={() => { localStorage.setItem('poreia:started', 'yes'); setStarted(true); nav.swap({ name: 'home' }); }} />;
  const page = route.name === 'home' ? <HomePage nav={nav} /> : route.name === 'trips' ? <TripsPage nav={nav} /> : route.name === 'calendar' ? <CalendarPage nav={nav} /> : route.name === 'pto' ? <PtoPage nav={nav} /> : <DiscoverPage nav={nav} />;
  return <div className="shell shell--tabs"><main key={route.name} className="page-enter">{page}</main><TabBar current={route.name} onPick={(tab) => swap({ name: tab })} /></div>;
}
