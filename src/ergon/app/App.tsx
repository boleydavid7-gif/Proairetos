import { useEffect } from 'react';
import { startSync } from '../../app/sync/syncController';
import { takeOpening } from '../../app/family/opening';
import { Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { BroomIcon, HomeIcon, MoreIcon } from '../../app/family/icons';
import { settings } from './state';
import WelcomePage from '../screens/WelcomePage';
import TodayPage from '../screens/TodayPage';
import ChoresPage from '../screens/ChoresPage';
import ChorePage from '../screens/ChorePage';
import HouseholdPage, { pendingInvite } from '../screens/HouseholdPage';
import MorePage from '../screens/MorePage';

export type Tab = 'today' | 'chores' | 'more';
export type Route = { name: 'welcome' } | { name: Tab } | { name: 'chore'; id?: string } | { name: 'household' };
export type ErgonNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'today', label: 'Today', Icon: HomeIcon },
  { id: 'chores', label: 'Chores', Icon: BroomIcon },
  { id: 'more', label: 'More', Icon: MoreIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

function firstRoute(): Route {
  // A link from another app, a notice or an invite: `add`, `household`, `chore:ID`, or a tab.
  const opening = takeOpening();
  if (opening === 'household' || pendingInvite()) return { name: 'household' };
  if (opening === 'add') return { name: 'chore' };
  if (opening?.startsWith('chore:')) return { name: 'chore', id: opening.slice(6) };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return settings.load().started || opening ? { name: 'today' } : { name: 'welcome' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('ergon', tabNames, firstRoute, { name: 'today' });

  useEffect(() => {
    void startSync();
  }, []);

  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'today':
        return <TodayPage nav={nav} />;
      case 'chores':
        return <ChoresPage nav={nav} />;
      case 'chore':
        return <ChorePage nav={nav} id={route.id} />;
      case 'household':
        return <HouseholdPage nav={nav} />;
      case 'more':
        return <MorePage nav={nav} />;
    }
  })();

  return (
    <Shell
      page={page}
      routeKey={JSON.stringify(route)}
      tabs={tabs}
      current={isTab ? (route.name as Tab) : undefined}
      onPick={(tab) => nav.swap({ name: tab })}
      showTabs={route.name !== 'welcome' && route.name !== 'chore'}
    />
  );
}
