import { useEffect } from 'react';
import { startSync } from '../../app/sync/syncController';
import { takeOpening } from '../../app/family/opening';
import { Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { BoxIcon, HomeIcon, MoreIcon } from '../../app/family/icons';
import { settings } from './state';
import WelcomePage from '../screens/WelcomePage';
import TodayPage from '../screens/TodayPage';
import ThingsPage from '../screens/ThingsPage';
import ThingPage from '../screens/ThingPage';
import UpkeepPage from '../screens/UpkeepPage';
import MorePage from '../screens/MorePage';
import PrintPage from '../screens/PrintPage';

export type Tab = 'today' | 'things' | 'more';
export type Route = { name: 'welcome' } | { name: Tab } | { name: 'thing'; id?: string } | { name: 'upkeep'; id?: string; thingId?: string; idea?: string } | { name: 'print' };
export type KtemaNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'today', label: 'Coming up', Icon: HomeIcon },
  { id: 'things', label: 'Things', Icon: BoxIcon },
  { id: 'more', label: 'More', Icon: MoreIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

function firstRoute(): Route {
  // From a notice, a shortcut or another app: `add`, `thing:ID`, `upkeep:ID`, `print`, or a tab.
  const opening = takeOpening();
  if (opening === 'add') return { name: 'thing' };
  if (opening?.startsWith('thing:')) return { name: 'thing', id: opening.slice(6) };
  if (opening?.startsWith('upkeep:')) return { name: 'upkeep', id: opening.slice(7) };
  if (opening === 'print') return { name: 'print' };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return settings.load().started || opening ? { name: 'today' } : { name: 'welcome' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('ktema', tabNames, firstRoute, { name: 'today' });

  useEffect(() => {
    void startSync();
  }, []);

  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'today':
        return <TodayPage nav={nav} />;
      case 'things':
        return <ThingsPage nav={nav} />;
      case 'thing':
        return <ThingPage nav={nav} id={route.id} />;
      case 'upkeep':
        return <UpkeepPage nav={nav} id={route.id} thingId={route.thingId} idea={route.idea} />;
      case 'more':
        return <MorePage nav={nav} />;
      case 'print':
        return <PrintPage nav={nav} />;
    }
  })();

  return (
    <Shell page={page} routeKey={JSON.stringify(route)} tabs={tabs} current={isTab ? (route.name as Tab) : undefined} onPick={(tab) => nav.swap({ name: tab })} showTabs={isTab} />
  );
}
