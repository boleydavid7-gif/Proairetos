import { useEffect } from 'react';
import { shareOutsideWithWorker } from './background';
import { startSync } from '../../app/sync/syncController';
import { takeOpening } from '../../app/family/opening';
import { Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { HomeIcon, LeafIcon, SettingsIcon } from '../../app/family/icons';
import { settings, usePlants } from './state';
import { refreshRain } from './rain';
import WelcomePage from '../screens/WelcomePage';
import TodayPage from '../screens/TodayPage';
import PlantsPage from '../screens/PlantsPage';
import PlantPage from '../screens/PlantPage';
import AddPage from '../screens/AddPage';
import IdentifyPage from '../screens/IdentifyPage';
import HomePage, { pendingInvite } from '../screens/HomePage';
import MorePage from '../screens/MorePage';
import YearScreen from '../screens/YearScreen';
import SitterPage from '../screens/SitterPage';

export type Tab = 'today' | 'plants' | 'more';
export type Route =
  | { name: 'welcome' }
  | { name: Tab }
  | { name: 'plant'; id?: string; species?: string; latin?: string; given?: string }
  | { name: 'add' }
  | { name: 'identify'; plantId?: string }
  | { name: 'home' }
  | { name: 'year' }
  | { name: 'sitter' };
export type PhytonNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'today', label: 'Today', Icon: HomeIcon },
  { id: 'plants', label: 'Plants', Icon: LeafIcon },
  { id: 'more', label: 'More', Icon: SettingsIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

function firstRoute(): Route {
  // A notice, a shortcut, another app or an invite: `add`, `identify`, `home`, `sitter`, `plant:ID`, or a tab.
  const opening = takeOpening();
  if (opening === 'home' || pendingInvite()) return { name: 'home' };
  if (opening === 'add') return { name: 'add' };
  if (opening === 'identify') return { name: 'identify' };
  if (opening === 'sitter') return { name: 'sitter' };
  if (opening?.startsWith('plant:')) return { name: 'plant', id: opening.slice(6) };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return settings.load().started || opening ? { name: 'today' } : { name: 'welcome' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('phyton', tabNames, firstRoute, { name: 'today' });

  useEffect(() => {
    void startSync();
    if (settings.load().rain) void refreshRain().finally(() => void shareOutsideWithWorker());
    else void shareOutsideWithWorker();
  }, []);
  // What the background frost check needs, kept current as plants and settings change.
  const plantsNow = usePlants();
  const current = settings.use();
  useEffect(() => {
    void shareOutsideWithWorker();
  }, [plantsNow, current]);

  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'today':
        return <TodayPage nav={nav} />;
      case 'plants':
        return <PlantsPage nav={nav} />;
      case 'plant':
        return <PlantPage nav={nav} id={route.id} species={route.species} latin={route.latin} given={route.given} />;
      case 'add':
        return <AddPage nav={nav} />;
      case 'identify':
        return <IdentifyPage nav={nav} plantId={route.plantId} />;
      case 'home':
        return <HomePage nav={nav} />;
      case 'more':
        return <MorePage nav={nav} />;
      case 'year':
        return <YearScreen nav={nav} />;
      case 'sitter':
        return <SitterPage nav={nav} />;
    }
  })();

  return (
    <Shell
      page={page}
      routeKey={JSON.stringify(route)}
      tabs={tabs}
      current={isTab ? (route.name as Tab) : undefined}
      onPick={(tab) => nav.swap({ name: tab })}
      showTabs={isTab}
    />
  );
}
