import { useCallback, useEffect, useRef, useState } from 'react';
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
import MorePage, { AboutPage, DataPage, SettingsPage, UsuallyPage } from '../screens/MorePage';

export type Route =
  | { name: 'welcome' }
  | { name: Tab; query?: string }
  | { name: 'recipe'; id: string }
  | { name: 'edit'; id?: string }
  | { name: 'import' }
  | { name: 'cook'; id: string; servings?: number }
  | { name: 'usually' }
  | { name: 'settings' }
  | { name: 'data' }
  | { name: 'about' };

export type Nav = { go: (route: Route) => void; swap: (route: Route) => void; back: () => void };

const isTab = (name: Route['name']): name is Tab => (tabNames as string[]).includes(name);

/** One page at a time, kept in the browser's history so back always leads somewhere sensible. */
export default function App() {
  const settings = useSettings();
  const [route, setRoute] = useState<Route>(() => (settings.started ? { name: 'home' } : { name: 'welcome' }));
  const [lastTab, setLastTab] = useState<Tab>('home');

  useEffect(() => {
    history.replaceState({ soma: route }, '');
    const onPop = (event: PopStateEvent) => {
      const next = (event.state as { soma?: Route } | null)?.soma;
      transition('back', () => setRoute(next ?? { name: 'home' }));
    };
    window.addEventListener('popstate', onPop);
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
    history.pushState({ soma: next }, '');
    transition(directionTo(next), () => setRoute(next));
  }, []);
  const swap = useCallback((next: Route) => {
    history.replaceState({ soma: next }, '');
    if (next.name === current.current.name && isTab(next.name) && !('query' in next && next.query)) return;
    transition(directionTo(next), () => setRoute(next));
  }, []);
  const back = useCallback(() => {
    if (history.state?.soma && history.length > 1) history.back();
    else swap({ name: lastTab });
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
        return <ImportPage nav={nav} />;
      case 'cook':
        return <CookPage nav={nav} id={route.id} servings={route.servings} />;
      case 'usually':
        return <UsuallyPage nav={nav} />;
      case 'settings':
        return <SettingsPage nav={nav} />;
      case 'data':
        return <DataPage nav={nav} />;
      case 'about':
        return <AboutPage nav={nav} />;
    }
  })();

  const showTabs = !['welcome', 'cook'].includes(route.name);
  return (
    <UndoProvider>
      <div className={`shell${showTabs ? ' shell--tabs' : ''}`}>
        <main key={JSON.stringify(route)} className="page-enter">
          {page}
        </main>
        {showTabs && <TabBar current={isTab(route.name) ? route.name : undefined} onPick={(tab) => swap({ name: tab })} />}
      </div>
    </UndoProvider>
  );
}
