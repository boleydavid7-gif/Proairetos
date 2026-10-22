import { useCallback, useEffect, useRef, useState } from 'react';
import YearScreen from '../screens/YearScreen';
import { startSync } from '../../app/sync/syncController';
import { directionAlong, transition, type Direction } from '../../app/transitions';
import { useSettings } from './state';
import { TabBar, tabNames, type Tab } from './ui';
import { UndoToast } from './undo';
import { takeOpening } from '../../app/family/opening';
import WelcomePage from '../screens/WelcomePage';
import HomePage from '../screens/HomePage';
import BillsPage from '../screens/BillsPage';
import CalendarPage from '../screens/CalendarPage';
import CapturePage from '../screens/CapturePage';
import PayPage from '../screens/PayPage';
import MorePage from '../screens/MorePage';
import BillPage from '../screens/BillPage';
import BudgetPage from '../screens/BudgetPage';
import SpentPage from '../screens/SpentPage';
import EnvelopesPage from '../screens/EnvelopesPage';

export type Route =
  | { name: 'welcome' }
  | { name: Tab }
  | { name: 'bill'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'budget' }
  | { name: 'spent' }
  | { name: 'envelopes' }
  | { name: 'about' }
  | { name: 'year' }
  | { name: 'pay' };

export type Nav = {
  go: (route: Route) => void;
  swap: (route: Route) => void;
  back: () => void;
};

const isTab = (name: Route['name']): name is Tab => (tabNames as string[]).includes(name);

export default function App() {
  const settings = useSettings();
  const [route, setRoute] = useState<Route>(() => {
    // A link from another app or a reminder: `bill:ID`, or a tab.
    const opening = takeOpening();
    if (opening?.startsWith('bill:')) return { name: 'bill', id: opening.slice(5) };
    if (opening === 'spent') return { name: 'spent' };
    if (opening === 'pay') return { name: 'pay' };
    if (opening === 'envelopes') return { name: 'envelopes' };
    if (opening && (tabNames as string[]).includes(opening)) return { name: opening as Tab };
    return settings.started || opening ? { name: 'today' } : { name: 'welcome' };
  });
  const [lastTab, setLastTab] = useState<Tab>('today');

  useEffect(() => {
    history.replaceState({ oikonomia: route }, '');
    const onPop = (event: PopStateEvent) => {
      const next = (event.state as { oikonomia?: Route } | null)?.oikonomia;
      transition('back', () => setRoute(next ?? { name: 'today' }));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (isTab(route.name)) setLastTab(route.name);
    window.scrollTo(0, 0);
  }, [route]);

  useEffect(() => {
    void startSync();
  }, []);

  const current = useRef(route);
  current.current = route;

  const directionTo = (next: Route): Direction => {
    const from = current.current.name;
    if (isTab(from) && isTab(next.name)) return directionAlong(tabNames, from, next.name);
    return isTab(next.name) && !isTab(from) ? 'back' : 'forward';
  };

  const go = useCallback((next: Route) => {
    history.pushState({ oikonomia: next }, '');
    transition(directionTo(next), () => setRoute(next));
  }, []);

  const swap = useCallback((next: Route) => {
    history.replaceState({ oikonomia: next }, '');
    if (next.name === current.current.name && isTab(next.name)) return;
    transition(directionTo(next), () => setRoute(next));
  }, []);

  const back = useCallback(() => {
    if (history.state?.oikonomia && history.length > 1) history.back();
    else swap({ name: lastTab });
  }, [lastTab, swap]);

  const nav: Nav = { go, swap, back };
  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'today':
        return <HomePage nav={nav} />;
      case 'bills':
        return <BillsPage nav={nav} />;
      case 'calendar':
        return <CalendarPage nav={nav} />;
      case 'capture':
        return <CapturePage nav={nav} />;
      case 'edit':
        return <CapturePage nav={nav} id={route.id} />;
      case 'more':
        return <MorePage nav={nav} />;
      case 'bill':
        return <BillPage nav={nav} id={route.id} />;
      case 'budget':
        return <BudgetPage nav={nav} />;
      case 'spent':
        return <SpentPage nav={nav} />;
      case 'envelopes':
        return <EnvelopesPage nav={nav} />;
      case 'about':
        return <MorePage nav={nav} about />;
      case 'year':
        return <YearScreen nav={nav} />;
      case 'pay':
        return <PayPage nav={nav} />;
    }
  })();

  const showTabs = route.name !== 'welcome' && route.name !== 'bill' && route.name !== 'edit';
  return (
    <div className={'shell' + (showTabs ? ' shell--tabs' : '')}>
      <main key={JSON.stringify(route)} className="page-enter">
        {page}
      </main>
      <UndoToast />
      {showTabs && <TabBar current={isTab(route.name) ? route.name : undefined} onPick={(tab) => swap({ name: tab })} />}
    </div>
  );
}
