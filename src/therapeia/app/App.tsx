import { useEffect } from 'react';
import { startSync } from '../../app/sync/syncController';
import { takeOpening } from '../../app/family/opening';
import { Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { HomeIcon, MoreIcon, PillIcon, PulseIcon, VisitIcon } from '../../app/family/icons';
import ReadingsPage from '../screens/ReadingsPage';
import { settings } from './state';
import WelcomePage from '../screens/WelcomePage';
import TodayPage from '../screens/TodayPage';
import MedicinesPage from '../screens/MedicinesPage';
import MedicinePage from '../screens/MedicinePage';
import VisitsPage from '../screens/VisitsPage';
import VisitPage from '../screens/VisitPage';
import MorePage from '../screens/MorePage';
import PrintPage from '../screens/PrintPage';

export type Tab = 'today' | 'medicines' | 'readings' | 'visits' | 'more';
export type Route = { name: 'welcome' } | { name: Tab } | { name: 'medicine'; id?: string } | { name: 'visit'; id?: string } | { name: 'print' };
export type TherapeiaNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'today', label: 'Today', Icon: HomeIcon },
  { id: 'medicines', label: 'Medicines', Icon: PillIcon },
  { id: 'readings', label: 'Readings', Icon: PulseIcon },
  { id: 'visits', label: 'Visits', Icon: VisitIcon },
  { id: 'more', label: 'More', Icon: MoreIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

function firstRoute(): Route {
  // From a notice, a shortcut or another app: `add`, `medicine:ID`, `visit:ID`, `add-visit`, `print`, or a tab.
  const opening = takeOpening();
  if (opening === 'add') return { name: 'medicine' };
  if (opening === 'add-visit') return { name: 'visit' };
  if (opening?.startsWith('medicine:')) return { name: 'medicine', id: opening.slice(9) };
  if (opening?.startsWith('visit:')) return { name: 'visit', id: opening.slice(6) };
  if (opening === 'print') return { name: 'print' };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return settings.load().started || opening ? { name: 'today' } : { name: 'welcome' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('therapeia', tabNames, firstRoute, { name: 'today' });

  useEffect(() => {
    void startSync();
  }, []);

  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'today':
        return <TodayPage nav={nav} />;
      case 'medicines':
        return <MedicinesPage nav={nav} />;
      case 'medicine':
        return <MedicinePage nav={nav} id={route.id} />;
      case 'readings':
        return <ReadingsPage />;
      case 'visits':
        return <VisitsPage nav={nav} />;
      case 'visit':
        return <VisitPage nav={nav} id={route.id} />;
      case 'more':
        return <MorePage nav={nav} />;
      case 'print':
        return <PrintPage nav={nav} />;
    }
  })();

  return (
    <Shell
      page={page}
      routeKey={JSON.stringify(route)}
      tabs={tabs}
      current={isTab ? (route.name as Tab) : undefined}
      onPick={(tab) => nav.swap({ name: tab })}
      showTabs={route.name !== 'welcome' && route.name !== 'medicine' && route.name !== 'visit' && route.name !== 'print'}
    />
  );
}
