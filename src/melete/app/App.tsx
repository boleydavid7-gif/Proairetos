import { useEffect } from 'react';
import { startSync } from '../../app/sync/syncController';
import { takeOpening } from '../../app/family/opening';
import { Brand, Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { AppMark, BookIcon, HomeIcon, SettingsIcon, WeekIcon } from '../../app/family/icons';
import TodayPage from '../screens/TodayPage';
import SubjectsPage from '../screens/SubjectsPage';
import SubjectPage from '../screens/SubjectPage';
import WeekPage from '../screens/WeekPage';
import SessionPage from '../screens/SessionPage';
import MorePage from '../screens/MorePage';

export type Tab = 'today' | 'subjects' | 'week' | 'more';
export type Route = { name: Tab } | { name: 'subject'; id?: string } | { name: 'session'; id?: string; subjectId?: string };
export type MeleteNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'today', label: 'Today', Icon: HomeIcon },
  { id: 'subjects', label: 'Subjects', Icon: BookIcon },
  { id: 'week', label: 'Week', Icon: WeekIcon },
  { id: 'more', label: 'More', Icon: SettingsIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

export function MeleteBrand() {
  return <Brand name="Meletē" mark={<AppMark app="melete" size={28} />} />;
}

function firstRoute(): Route {
  const opening = takeOpening();
  if (opening?.startsWith('subject:')) return { name: 'subject', id: opening.slice(8) };
  if (opening?.startsWith('session:')) return { name: 'session', id: opening.slice(8) };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return { name: 'today' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('melete', tabNames, firstRoute, { name: 'today' });

  useEffect(() => {
    void startSync();
  }, []);

  const page = (() => {
    switch (route.name) {
      case 'today':
        return <TodayPage nav={nav} />;
      case 'subjects':
        return <SubjectsPage nav={nav} />;
      case 'subject':
        return <SubjectPage nav={nav} id={route.id} />;
      case 'week':
        return <WeekPage nav={nav} />;
      case 'session':
        return <SessionPage nav={nav} id={route.id} subjectId={route.subjectId} />;
      case 'more':
        return <MorePage />;
    }
  })();

  return <Shell page={page} routeKey={JSON.stringify(route)} tabs={tabs} current={isTab ? route.name : undefined} onPick={(tab) => nav.swap({ name: tab })} showTabs={isTab} />;
}
