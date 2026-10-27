import { useEffect, useState } from 'react';
import { takeOpening } from '../../app/family/opening';
import { Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { BookIcon, ClockIcon, SettingsIcon, SuitcaseIcon, WalletIcon } from '../../app/family/icons';
import type { BookingKind } from '../core/model';
import type { Spot } from '../core/spots';
import { countFirstVersion } from './fresh';
import { recountPlanned } from './proairetos';
import { bookings, settings, today, trips } from './state';
import { sortTrips } from '../core/model';
import WelcomePage from '../screens/WelcomePage';
import TripsPage from '../screens/TripsPage';
import TripPage, { type TripView } from '../screens/TripPage';
import TripForm from '../screens/TripForm';
import BookingForm from '../screens/BookingForm';
import BudgetPage from '../screens/BudgetPage';
import TimeOffPage from '../screens/TimeOffPage';
import TimeOffForm from '../screens/TimeOffForm';
import TimeOffSetupPage from '../screens/TimeOffSetupPage';
import MorePage from '../screens/MorePage';
import FreshPage from '../screens/FreshPage';
import PlanPage from '../screens/PlanPage';
import DocumentsPage, { DocumentPage } from '../screens/DocumentsPage';
import PlacePage from '../screens/PlacePage';
import BeenPage, { YearScreen } from '../screens/BeenPage';
import JournalPage from '../screens/JournalPage';

export type Tab = 'trips' | 'budget' | 'journal' | 'time' | 'more';
export type Route =
  | { name: 'welcome' }
  | { name: 'fresh'; count: number }
  | { name: Tab; placeId?: string }
  | { name: 'budget' | 'time' }
  | { name: 'trip'; id: string; view?: TripView }
  | { name: 'trip-form'; id?: string; draft?: { name?: string; place?: string } }
  | { name: 'booking'; tripId: string; id?: string; kind?: BookingKind; paste?: boolean }
  | { name: 'time-off'; id?: string; tripId?: string }
  | { name: 'time-setup' }
  | { name: 'been' }
  | { name: 'year' }
  | { name: 'plan'; id: string }
  | { name: 'place'; spot: Spot; tripId?: string }
  | { name: 'documents'; tripId?: string }
  | { name: 'document'; id?: string; tripId?: string };
export type PoreiaNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'trips', label: 'Trips', Icon: SuitcaseIcon },
  { id: 'budget', label: 'Budget', Icon: WalletIcon },
  { id: 'journal', label: 'Journal', Icon: BookIcon },
  { id: 'time', label: 'Time off', Icon: ClockIcon },
  { id: 'more', label: 'More', Icon: SettingsIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

function firstRoute(): Route {
  // From a notice, a shortcut or another app: `trip:ID`, `add`, `budget`, `time`, `booking:TRIP`.
  const opening = takeOpening();
  if (opening?.startsWith('trip:')) return { name: 'trip', id: opening.slice(5) };
  if (opening === 'add') return { name: 'trip-form' };
  if (opening?.startsWith('booking:')) return { name: 'booking', tripId: opening.slice(8), paste: true };
  // From a reminder: one booking, or one plan.
  if (opening?.startsWith('booked:')) {
    const booking = bookings.get(opening.slice(7));
    if (booking) return { name: 'booking', tripId: booking.tripId, id: booking.id };
  }
  if (opening?.startsWith('plan:')) return { name: 'plan', id: opening.slice(5) };
  // A confirmation shared in, or a file opened with Poreia: a new booking on the trip under way or next (the form reads it).
  if (opening === 'shared') {
    const { now, ahead, someday } = sortTrips(trips.list(), today());
    const trip = now[0] ?? ahead[0] ?? someday[0];
    if (trip) return { name: 'booking', tripId: trip.id, paste: true };
    return { name: 'trip-form' };
  }
  if (opening === 'documents') return { name: 'documents' };
  if (opening === 'budget') return { name: 'budget' };
  if (opening === 'time') return { name: 'time' };
  if (opening === 'journal') return { name: 'journal' };
  if (opening === 'been') return { name: 'been' };
  if (opening === 'year') return { name: 'year' };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return settings.load().started || opening ? { name: 'trips' } : { name: 'welcome' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('poreia', tabNames, firstRoute, { name: 'trips' }, { keepBackInApp: true });
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
      case 'budget':
        return <BudgetPage nav={nav} />;
      case 'time':
        return <TimeOffPage nav={nav} />;
      case 'journal':
        return <JournalPage nav={nav} />;
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
      case 'been':
        return <BeenPage nav={nav} />;
      case 'year':
        return <YearScreen nav={nav} />;
      case 'plan':
        return <PlanPage nav={nav} id={route.id} />;
      case 'place':
        return <PlacePage nav={nav} spot={route.spot} tripId={route.tripId} />;
      case 'documents':
        return <DocumentsPage nav={nav} tripId={route.tripId} />;
      case 'document':
        return <DocumentPage key={route.id ?? 'new'} nav={nav} id={route.id} tripId={route.tripId} />;
    }
  })();

  return <Shell page={checked || route.name === 'welcome' ? page : null} routeKey={JSON.stringify(route)} tabs={tabs} current={isTab ? (route.name as Tab) : undefined} onPick={(tab) => nav.swap({ name: tab })} showTabs={route.name !== 'welcome' && route.name !== 'fresh'} />;
}
