import { useEffect, useState } from 'react';
import { takeOpening } from '../../app/family/opening';
import { Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { ClockIcon, GlobeIcon, SettingsIcon, SuitcaseIcon } from '../../app/family/icons';
import type { BookingKind } from '../core/model';
import type { SearchKind } from '../core/links';
import { countFirstVersion } from './fresh';
import { recountPlanned } from './proairetos';
import { settings } from './state';
import WelcomePage from '../screens/WelcomePage';
import TripsPage from '../screens/TripsPage';
import TripPage, { type TripView } from '../screens/TripPage';
import TripForm from '../screens/TripForm';
import BookingForm from '../screens/BookingForm';
import ExplorePage from '../screens/ExplorePage';
import TimeOffPage from '../screens/TimeOffPage';
import TimeOffForm from '../screens/TimeOffForm';
import TimeOffSetupPage from '../screens/TimeOffSetupPage';
import MorePage from '../screens/MorePage';
import FreshPage from '../screens/FreshPage';

export type Tab = 'trips' | 'explore' | 'time' | 'more';
export type Route =
  | { name: 'welcome' }
  | { name: 'fresh'; count: number }
  | { name: Tab; placeId?: string; search?: SearchKind }
  | { name: 'trip'; id: string; view?: TripView }
  | { name: 'trip-form'; id?: string; draft?: { name?: string; place?: string } }
  | { name: 'booking'; tripId: string; id?: string; kind?: BookingKind; paste?: boolean }
  | { name: 'time-off'; id?: string; tripId?: string }
  | { name: 'time-setup' };
export type PoreiaNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'trips', label: 'Trips', Icon: SuitcaseIcon },
  { id: 'explore', label: 'Explore', Icon: GlobeIcon },
  { id: 'time', label: 'Time off', Icon: ClockIcon },
  { id: 'more', label: 'More', Icon: SettingsIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

function firstRoute(): Route {
  // From a notice, a shortcut or another app: `trip:ID`, `add`, `explore`, `time`, `booking:TRIP`.
  const opening = takeOpening();
  if (opening?.startsWith('trip:')) return { name: 'trip', id: opening.slice(5) };
  if (opening === 'add') return { name: 'trip-form' };
  if (opening?.startsWith('booking:')) return { name: 'booking', tripId: opening.slice(8), paste: true };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return settings.load().started || opening ? { name: 'trips' } : { name: 'welcome' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('poreia', tabNames, firstRoute, { name: 'trips' });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // The first Poreia's records: said once, with Save a copy, then cleared (FreshPage).
    void countFirstVersion().then((count) => {
      setChecked(true);
      if (count > 0) nav.swap({ name: 'fresh', count });
    });
    void recountPlanned();
  }, []);

  const page = (() => {
    switch (route.name) {
      case 'welcome':
        return <WelcomePage nav={nav} />;
      case 'fresh':
        return <FreshPage nav={nav} count={route.count} />;
      case 'trips':
        return <TripsPage nav={nav} />;
      case 'explore':
        return <ExplorePage nav={nav} search={route.search} />;
      case 'time':
        return <TimeOffPage nav={nav} />;
      case 'more':
        return <MorePage nav={nav} />;
      case 'trip':
        return <TripPage nav={nav} id={route.id} view={route.view} />;
      case 'trip-form':
        return <TripForm nav={nav} id={route.id} draft={route.draft} />;
      case 'booking':
        return <BookingForm nav={nav} tripId={route.tripId} id={route.id} kind={route.kind} paste={route.paste} />;
      case 'time-off':
        return <TimeOffForm nav={nav} id={route.id} tripId={route.tripId} />;
      case 'time-setup':
        return <TimeOffSetupPage nav={nav} />;
    }
  })();

  return <Shell page={checked || route.name === 'welcome' ? page : null} routeKey={JSON.stringify(route)} tabs={tabs} current={isTab ? (route.name as Tab) : undefined} onPick={(tab) => nav.swap({ name: tab })} showTabs={route.name !== 'welcome' && route.name !== 'fresh'} />;
}
