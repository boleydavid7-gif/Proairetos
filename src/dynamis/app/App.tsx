import { useEffect } from 'react';
import { startSync } from '../../app/sync/syncController';
import { takeOpening } from '../../app/family/opening';
import { Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { HistoryIcon, HomeIcon, MoreIcon, StretchIcon } from '../../app/family/icons';
import { settings } from './state';
import WelcomePage from '../screens/WelcomePage';
import TodayPage from '../screens/TodayPage';
import PlanPage from '../screens/PlanPage';
import SessionPage from '../screens/SessionPage';
import LogPage from '../screens/LogPage';
import WorkoutPage from '../screens/WorkoutPage';
import MobilityPage from '../screens/MobilityPage';
import GuidePage from '../screens/GuidePage';
import MorePage from '../screens/MorePage';
import WhyPage from '../screens/WhyPage';

export type Tab = 'today' | 'log' | 'mobility' | 'more';
export type Route =
  | { name: 'welcome' }
  | { name: Tab }
  | { name: 'plan' }
  | { name: 'session' }
  | { name: 'workout'; id: string }
  | { name: 'guide'; routine: string }
  | { name: 'why' };
export type DynamisNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'today', label: 'Today', Icon: HomeIcon },
  { id: 'log', label: 'Log', Icon: HistoryIcon },
  { id: 'mobility', label: 'Mobility', Icon: StretchIcon },
  { id: 'more', label: 'More', Icon: MoreIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

function firstRoute(): Route {
  // From a notice, a shortcut or another app: `session`, `mobility`, `routine:ID`, `workout:ID`, or a tab.
  const opening = takeOpening();
  if (opening === 'session') return { name: 'session' };
  if (opening?.startsWith('routine:')) return { name: 'guide', routine: opening.slice(8) };
  if (opening?.startsWith('workout:')) return { name: 'workout', id: opening.slice(8) };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return settings.load().started || opening ? { name: 'today' } : { name: 'welcome' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('dynamis', tabNames, firstRoute, { name: 'today' });

  useEffect(() => {
    void startSync();
  }, []);

  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'today':
        return <TodayPage nav={nav} />;
      case 'plan':
        return <PlanPage nav={nav} />;
      case 'session':
        return <SessionPage nav={nav} />;
      case 'log':
        return <LogPage nav={nav} />;
      case 'workout':
        return <WorkoutPage nav={nav} id={route.id} />;
      case 'mobility':
        return <MobilityPage nav={nav} />;
      case 'guide':
        return <GuidePage nav={nav} routine={route.routine} />;
      case 'more':
        return <MorePage nav={nav} />;
      case 'why':
        return <WhyPage nav={nav} />;
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
