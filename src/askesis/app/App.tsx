import { useCallback, useEffect, useRef, useState } from 'react';
import { directionAlong, transition, type Direction } from '../../app/transitions';
import { usePlan, usePlanState, useSettings } from './state';
import { TabBar, UndoProvider, type Tab } from './ui';
import HomePage from '../screens/HomePage';
import LearnPage, { ArticlePage } from '../screens/LearnPage';
import TrainPage from '../screens/TrainPage';
import LogPage from '../screens/LogPage';
import EntryPage from '../screens/EntryPage';
import MorePage from '../screens/MorePage';
import WorkoutPage from '../screens/WorkoutPage';
import GuidePage from '../screens/GuidePage';
import WelcomePage from '../screens/WelcomePage';
import PlanPage from '../screens/PlanPage';
import AfterPage from '../screens/AfterPage';
import { AboutPage, DataPage, PacePage, SafetyPage, SettingsPage, ZonesPage } from '../screens/MorePages';

export type Route =
  | { name: Tab }
  | { name: 'welcome' }
  | { name: 'safety'; first?: boolean }
  | { name: 'plan'; first?: boolean }
  | { name: 'workout'; id: string }
  | { name: 'guide'; id: string; intention?: string }
  | { name: 'entry'; id?: string; workoutId?: string; seconds?: number; intention?: string; date?: string }
  | { name: 'article'; id: string }
  | { name: 'zones' }
  | { name: 'pace' }
  | { name: 'settings' }
  | { name: 'data' }
  | { name: 'about' }
  | { name: 'after'; id: string };

export type Nav = {
  go: (route: Route) => void;
  /** Replaces the page in place (a tab, or the next step of setup). */
  swap: (route: Route) => void;
  back: () => void;
};

const tabNames: Tab[] = ['home', 'learn', 'train', 'log', 'more'];
const isTab = (name: Route['name']): name is Tab => (tabNames as string[]).includes(name);

/**
 * One page at a time, kept in the browser's history so the phone's back
 * gesture and back button always lead somewhere sensible.
 */
export default function App() {
  const settings = useSettings();
  const planState = usePlanState();
  const plan = usePlan(planState);
  const [route, setRoute] = useState<Route>(() => (settings.started || planState ? { name: 'home' } : { name: 'welcome' }));
  const [lastTab, setLastTab] = useState<Tab>('home');

  useEffect(() => {
    history.replaceState({ askesis: route }, '');
    const onPop = (event: PopStateEvent) => {
      const next = (event.state as { askesis?: Route } | null)?.askesis;
      // The phone's back gesture and button: the page slides away, the one beneath comes forward.
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
  /** Along the tab bar, the new page comes from the side tapped; anything else pushes in. */
  const directionTo = (next: Route): Direction => {
    const from = current.current.name;
    if (isTab(from) && isTab(next.name)) return directionAlong(tabNames, from, next.name);
    return isTab(next.name) && !isTab(from) ? 'back' : 'forward';
  };
  const go = useCallback((next: Route) => {
    history.pushState({ askesis: next }, '');
    transition(directionTo(next), () => setRoute(next));
  }, []);
  const swap = useCallback((next: Route) => {
    history.replaceState({ askesis: next }, '');
    if (next.name === current.current.name && isTab(next.name)) return;
    transition(directionTo(next), () => setRoute(next));
  }, []);
  const back = useCallback(() => {
    if (history.state?.askesis && history.length > 1) history.back();
    else swap({ name: lastTab });
  }, [lastTab, swap]);
  const nav: Nav = { go, swap, back };

  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'safety':
        return <SafetyPage nav={nav} first={route.first} />;
      case 'plan':
        return <PlanPage nav={nav} first={route.first} />;
      case 'home':
        return <HomePage nav={nav} plan={plan} planState={planState} />;
      case 'learn':
        return <LearnPage nav={nav} />;
      case 'train':
        return <TrainPage nav={nav} plan={plan} planState={planState} />;
      case 'log':
        return <LogPage nav={nav} />;
      case 'more':
        return <MorePage nav={nav} plan={plan} />;
      case 'workout':
        return <WorkoutPage nav={nav} id={route.id} plan={plan} planState={planState} />;
      case 'guide':
        return <GuidePage nav={nav} id={route.id} plan={plan} intention={route.intention} />;
      case 'entry':
        return <EntryPage nav={nav} route={route} plan={plan} />;
      case 'article':
        return <ArticlePage nav={nav} id={route.id} />;
      case 'zones':
        return <ZonesPage nav={nav} />;
      case 'pace':
        return <PacePage nav={nav} />;
      case 'settings':
        return <SettingsPage nav={nav} />;
      case 'data':
        return <DataPage nav={nav} />;
      case 'about':
        return <AboutPage nav={nav} />;
      case 'after':
        return <AfterPage nav={nav} id={route.id} />;
    }
  })();

  const showTabs = !['welcome', 'safety', 'guide'].includes(route.name) && !(route.name === 'plan' && route.first);
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
