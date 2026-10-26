import { useCallback, useEffect, useRef, useState } from 'react';
import YearScreen from '../screens/YearScreen';
import { takeOpening } from '../../app/family/opening';
import { directionAlong, transition, type Direction } from '../../app/transitions';
import { useSettings } from './state';
import { TabBar, tabNames, UndoProvider, type Tab } from './ui';
import WelcomePage from '../screens/WelcomePage';
import HomePage from '../screens/HomePage';
import RecipesPage from '../screens/RecipesPage';
import RecipePage from '../screens/RecipePage';
import EditPage from '../screens/EditPage';
import ImportPage from '../screens/ImportPage';
import IdeasPage from '../screens/IdeasPage';
import GroceriesPage from '../screens/GroceriesPage';
import CookPage from '../screens/CookPage';
import TonightPage from '../screens/TonightPage';
import WeekPage from '../screens/WeekPage';
import PausePage from '../screens/PausePage';
import SeasonPage, { ProducePage } from '../screens/SeasonPage';
import type { Mark } from '../core/recipes';
import type { TimeChoice } from '../core/tonight';
import MorePage, { AboutPage, DataPage, SettingsPage, UsuallyPage } from '../screens/MorePage';

export type Route =
  | { name: 'welcome' }
  | { name: Tab; query?: string }
  | { name: 'recipe'; id: string }
  | { name: 'edit'; id?: string }
  | { name: 'import'; how?: 'app' }
  | { name: 'cook'; id: string; scale?: number }
  | { name: 'tonight'; time?: TimeChoice }
  | { name: 'week'; mark?: Mark }
  | { name: 'pause'; id: string }
  | { name: 'season' }
  | { name: 'produce'; id: string }
  | { name: 'usually' }
  | { name: 'settings' }
  | { name: 'data' }
  | { name: 'about' }
  | { name: 'year' };

export type Nav = { go: (route: Route) => void; swap: (route: Route) => void; back: () => void };

const isTab = (name: Route['name']): name is Tab => (tabNames as string[]).includes(name);

/** One page at a time, kept in the browser's history so back always leads somewhere sensible. */
export default function App() {
  const settings = useSettings();
  const [route, setRoute] = useState<Route>(() => (settings.started ? { name: 'home' } : { name: 'welcome' }));
  const [lastTab, setLastTab] = useState<Tab>('home');
  const routeHistory = useRef<Route[]>([]);
  if (routeHistory.current.length === 0) routeHistory.current.push(route);

  useEffect(() => {
    history.replaceState({ soma: route }, '');
    const onPop = (event: PopStateEvent) => {
      const next = (event.state as { soma?: Route } | null)?.soma;
      if (!next) {
        history.forward();
        return;
      }
      routeHistory.current = routeHistory.current.length > 1 ? routeHistory.current.slice(0, -1) : [next];
      transition('back', () => setRoute(next));
    };
    window.addEventListener('popstate', onPop);
    // Opened from Proairetos at a particular place: that page, with Home beneath it.
    const open = takeOpening();
    if (open && settings.started) {
      const [kind, id] = open.split(':');
      if (kind === 'recipe' && id) go({ name: 'recipe', id });
      else if (kind === 'week' || kind === 'tonight') go({ name: kind });
      else if (kind === 'list') swap({ name: 'groceries' });
      else if (kind === 'import') go({ name: 'import', how: id === 'app' ? 'app' : undefined });
      else if (isTab(kind as Route['name'])) swap({ name: kind as Tab });
    }
    return () => window.removeEventListener('popstate', onPop);
    // Only once: the first page is already in history.
  }, []);

  useEffect(() => {
    if (isTab(route.name)) setLastTab(route.name);
    window.scrollTo(0, 0);
  }, [route]);

  const current = useRef(route);
  current.current = route;
  const directionTo = (next: Route): Direction => {
    const from = current.current.name;
    if (isTab(from) && isTab(next.name)) return directionAlong(tabNames, from, next.name);
    return isTab(next.name) && !isTab(from) ? 'back' : 'forward';
  };
  const go = useCallback((next: Route) => {
    routeHistory.current.push(next);
    history.pushState({ soma: next }, '');
    transition(directionTo(next), () => setRoute(next));
  }, []);
  const swap = useCallback((next: Route) => {
    routeHistory.current[routeHistory.current.length - 1] = next;
    history.replaceState({ soma: next }, '');
    if (next.name === current.current.name && isTab(next.name) && !('query' in next && next.query)) return;
    transition(directionTo(next), () => setRoute(next));
  }, []);
  const back = useCallback(() => {
    if (routeHistory.current.length > 1) {
      routeHistory.current.pop();
      const previous = routeHistory.current[routeHistory.current.length - 1];
      history.replaceState({ soma: previous }, '');
      transition('back', () => setRoute(previous));
      return;
    }
    swap({ name: lastTab });
  }, [lastTab, swap]);
  const nav: Nav = { go, swap, back };

  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'home':
        return <HomePage nav={nav} />;
      case 'recipes':
        return <RecipesPage nav={nav} query={route.query} />;
      case 'ideas':
        return <IdeasPage nav={nav} />;
      case 'groceries':
        return <GroceriesPage nav={nav} />;
      case 'more':
        return <MorePage nav={nav} />;
      case 'recipe':
        return <RecipePage nav={nav} id={route.id} />;
      case 'edit':
        return <EditPage nav={nav} id={route.id} />;
      case 'import':
        return <ImportPage nav={nav} how={route.how} />;
      case 'cook':
        return <CookPage nav={nav} id={route.id} scale={route.scale} />;
      case 'tonight':
        return <TonightPage nav={nav} time={route.time} />;
      case 'week':
        return <WeekPage nav={nav} mark={route.mark} />;
      case 'season':
        return <SeasonPage nav={nav} />;
      case 'produce':
        return <ProducePage nav={nav} id={route.id} />;
      case 'pause':
        return <PausePage nav={nav} id={route.id} />;
      case 'usually':
        return <UsuallyPage nav={nav} />;
      case 'settings':
        return <SettingsPage nav={nav} />;
      case 'data':
        return <DataPage nav={nav} />;
      case 'about':
        return <AboutPage nav={nav} />;
      case 'year':
        return <YearScreen nav={nav} />;
    }
  })();

  const showTabs = !['welcome', 'cook', 'pause'].includes(route.name);
  return (
    <UndoProvider>
      <div className={`shell${showTabs ? ' shell--tabs' : ''}`}>
        <main key={JSON.stringify(route)} className="page-enter">
          {page}
        </main>
        {showTabs && <TabBar current={isTab(route.name) ? route.name : lastTab} onPick={(tab) => swap({ name: tab })} />}
      </div>
    </UndoProvider>
  );
}
