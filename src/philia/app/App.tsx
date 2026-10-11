import { useEffect } from 'react';
import { startSync } from '../../app/sync/syncController';
import { takeOpening } from '../../app/family/opening';
import { Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { HomeIcon, MoreIcon, PeopleIcon } from '../../app/family/icons';
import { settings } from './state';
import WelcomePage from '../screens/WelcomePage';
import HomePage from '../screens/HomePage';
import PeoplePage from '../screens/PeoplePage';
import PersonPage from '../screens/PersonPage';
import EditPage from '../screens/EditPage';
import MorePage from '../screens/MorePage';

export type Tab = 'home' | 'people' | 'more';
export type Route = { name: 'welcome' } | { name: Tab } | { name: 'person'; id: string } | { name: 'edit'; id?: string };
export type PhiliaNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'people', label: 'People', Icon: PeopleIcon },
  { id: 'more', label: 'More', Icon: MoreIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

function firstRoute(): Route {
  // A link from another app or a notice: `person:ID`, `add`, or a tab.
  const opening = takeOpening();
  if (opening?.startsWith('person:')) return { name: 'person', id: opening.slice(7) };
  if (opening === 'add') return { name: 'edit' };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return settings.load().started || opening ? { name: 'home' } : { name: 'welcome' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('philia', tabNames, firstRoute, { name: 'home' });

  useEffect(() => {
    void startSync();
  }, []);

  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'home':
        return <HomePage nav={nav} />;
      case 'people':
        return <PeoplePage nav={nav} />;
      case 'person':
        return <PersonPage nav={nav} id={route.id} />;
      case 'edit':
        return <EditPage nav={nav} id={route.id} />;
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
      showTabs={route.name !== 'welcome' && route.name !== 'edit'}
    />
  );
}
