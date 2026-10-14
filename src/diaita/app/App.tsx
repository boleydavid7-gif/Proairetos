import { useEffect } from 'react';
import { startSync } from '../../app/sync/syncController';
import { takeOpening } from '../../app/family/opening';
import { Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { HomeIcon, MoonIcon, MoreIcon, WeekIcon } from '../../app/family/icons';
import { settings } from './state';
import WelcomePage from '../screens/WelcomePage';
import TodayPage from '../screens/TodayPage';
import WeekPage from '../screens/WeekPage';
import SleepPage from '../screens/SleepPage';
import MorePage from '../screens/MorePage';
import YearScreen from '../screens/YearScreen';
import DayPage from '../screens/DayPage';
import SourcesPage from '../screens/SourcesPage';
import NapPage from '../screens/NapPage';
import WindDownPage from '../screens/WindDownPage';
import CantSleepPage from '../screens/CantSleepPage';
import WorryPage from '../screens/WorryPage';

export type Tab = 'today' | 'week' | 'sleep' | 'more';
export type Route = { name: 'welcome' } | { name: Tab } | { name: 'day'; date: string } | { name: 'sources' } | { name: 'log'; date?: string } | { name: 'nap' } | { name: 'year' } | { name: 'worry' } | { name: 'wind-down' } | { name: 'cant-sleep' };
export type DiaitaNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'today', label: 'Today', Icon: HomeIcon },
  { id: 'week', label: 'Week', Icon: WeekIcon },
  { id: 'sleep', label: 'Sleep', Icon: MoonIcon },
  { id: 'more', label: 'More', Icon: MoreIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

function firstRoute(): Route {
  // A link from another app or a notice: `week`, `sleep`, `log`, `day:DATE`, or a bedtime screen.
  const opening = takeOpening();
  if (opening?.startsWith('day:')) return { name: 'day', date: opening.slice(4) };
  if (opening === 'log') return { name: 'log' };
  if (opening === 'nap') return { name: 'nap' };
  if (opening === 'wind-down') return { name: 'wind-down' };
  if (opening === 'cant-sleep') return { name: 'cant-sleep' };
  if (opening === 'worry') return { name: 'worry' };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return settings.load().started || opening ? { name: 'today' } : { name: 'welcome' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('diaita', tabNames, firstRoute, { name: 'today' });

  useEffect(() => {
    void startSync();
  }, []);

  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'today':
        return <TodayPage nav={nav} />;
      case 'week':
        return <WeekPage nav={nav} />;
      case 'sleep':
        return <SleepPage nav={nav} />;
      case 'log':
        return <SleepPage nav={nav} adding={route.date ?? true} />;
      case 'more':
        return <MorePage nav={nav} />;
      case 'year':
        return <YearScreen nav={nav} />;
      case 'day':
        return <DayPage nav={nav} date={route.date} />;
      case 'sources':
        return <SourcesPage nav={nav} />;
      case 'nap':
        return <NapPage nav={nav} />;
      case 'wind-down':
        return <WindDownPage nav={nav} />;
      case 'cant-sleep':
        return <CantSleepPage nav={nav} />;
      case 'worry':
        return <WorryPage nav={nav} />;
    }
  })();

  return (
    <Shell
      page={page}
      routeKey={JSON.stringify(route)}
      tabs={tabs}
      current={isTab ? (route.name as Tab) : undefined}
      onPick={(tab) => nav.swap({ name: tab })}
      showTabs={route.name !== 'welcome'}
    />
  );
}
