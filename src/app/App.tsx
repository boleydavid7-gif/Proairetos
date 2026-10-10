import CommandPalette from './palette/CommandPalette';
import LockScreen from './lock/LockScreen';
import { lock, lockedRoutes } from './lock/lock';
import EdgeSwipe from './back/EdgeSwipe';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { startSync } from './sync/syncController';
import { otherCalendars } from './calendars/otherCalendars';
import { weather } from './weather/weather';
import OnboardingPage from '../features/onboarding/OnboardingPage';
import NowPage from '../features/now/NowPage';
import CapturePage from '../features/capture/CapturePage';
import ReflectPage from '../features/reflect/ReflectPage';
import CompassPage from '../features/compass/CompassPage';
import ScheduleScreen from '../features/schedule/ScheduleScreen';
import WeeklyReview from '../features/review/WeeklyReview';
import SettingsPage from '../features/settings/SettingsPage';
import JournalPage from '../features/journal/JournalPage';
import InsightsPage from '../features/insights/InsightsPage';
import DaysAheadPage from '../features/days/DaysAheadPage';
import MeditatePage from '../features/meditate/MeditatePage';
import SharedSheet from '../features/share/SharedSheet';
import { takeShared } from '../features/share/shared';
import AppShell from './AppShell';
import NoticeOpener from './notify/NoticeOpener';
import { notifications } from './notify/notifications';
import { directionBetween, transition } from './transitions';
import { useShortcuts } from './shortcuts';
import OverlayProvider from './overlays/OverlayProvider';
import { NavigationContext, ReturnRouteContext } from './navigationContext';
import { defaultRoute, routePaths, type AppRoute } from './routes/routeTypes';
import { hasOnboarded, markOnboarded, startLight } from '../data/storage/preferences';

const mainTabs: ReadonlySet<AppRoute> = new Set(['today', 'reflect', 'plan', 'calendar', 'capture', 'compass']);
const routeFromLocation = (): AppRoute => {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return (Object.entries(routePaths).find(([, routePath]) => routePath === path)?.[0] as AppRoute | undefined) ?? defaultRoute;
};

export default function App() {
  const [started, setStarted] = useState(hasOnboarded);
  const locked = useSyncExternalStore(lock.subscribe, lock.isLocked);
  useEffect(() => lock.watchAway(), []);
  const [route, setRoute] = useState<AppRoute>(routeFromLocation);
  const current = useRef(route);
  current.current = route;
  // Every move between places slides the way it goes (see transitions.ts).
  const go = useCallback((next: AppRoute) => {
    const from = current.current;
    if (next === from) return;
    transition(directionBetween(from, next), () => setRoute(next));
  }, []);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useShortcuts(go, openPalette);
  const [lastTab, setLastTab] = useState<AppRoute>(defaultRoute);
  // Read once at start; kept until onboarding is done, if it is not yet.
  const [shared, setShared] = useState(takeShared);

  useEffect(() => {
    if (mainTabs.has(route)) setLastTab(route);
  }, [route]);

  useEffect(() => {
    void startSync();
    // Other calendars refresh on open and when the app comes back into view (at most hourly).
    void otherCalendars.refresh();
    void weather.refresh();
    notifications.start();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void otherCalendars.refresh();
      void weather.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  if (!started) {
    return (
      <OnboardingPage
        onGetStarted={(next) => {
          markOnboarded();
          startLight();
          if (next) setRoute(next);
          setStarted(true);
        }}
      />
    );
  }

  return (
    <NavigationContext.Provider value={go}>
    <ReturnRouteContext.Provider value={lastTab}>
    <EdgeSwipe />
    <OverlayProvider>
      <NoticeOpener />
      <AppShell route={route} onNavigate={go}>
      {route === 'today' && <NowPage />}
      {locked && lockedRoutes.includes(route) && <LockScreen />}
      {route === 'reflect' && !locked && <ReflectPage />}
      {route === 'capture' && <CapturePage />}
      {route === 'compass' && <CompassPage />}
      {route === 'schedule' && <ScheduleScreen />}
      {route === 'review' && !locked && <WeeklyReview />}
      {route === 'settings' && <SettingsPage />}
      {route === 'journal' && !locked && <JournalPage />}
      {route === 'insights' && !locked && <InsightsPage />}
      {route === 'plan' && <DaysAheadPage key="list" view="list" />}
      {route === 'calendar' && <DaysAheadPage key="calendar" view="calendar" />}
      {route === 'meditate' && <MeditatePage />}
      </AppShell>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {shared && <SharedSheet text={shared} onClose={() => setShared(undefined)} />}
    </OverlayProvider>
    </ReturnRouteContext.Provider>
    </NavigationContext.Provider>
  );
}
