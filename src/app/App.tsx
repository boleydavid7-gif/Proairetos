import CommandPalette from './palette/CommandPalette';
import LockScreen from './lock/LockScreen';
import { lock, lockedRoutes } from './lock/lock';
import EdgeSwipe from './back/EdgeSwipe';
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { startSync } from './sync/syncController';
import { otherCalendars } from './calendars/otherCalendars';
import { weather } from './weather/weather';
import NowPage from '../features/now/NowPage';
import CapturePage from '../features/capture/CapturePage';
import ReflectPage from '../features/reflect/ReflectPage';
import CompassPage from '../features/compass/CompassPage';
import DaysAheadPage from '../features/days/DaysAheadPage';
import SharedSheet from '../features/share/SharedSheet';
import InboxOpener from './capture/InboxOpener';
import TrainingClash from '../features/training/TrainingClash';
import { takeShared } from '../features/share/shared';
import { InsightsPage, JournalPage, laterPages, MeditatePage, OnboardingPage, ScheduleScreen, SettingsPage, WeeklyReview } from './laterPages';
import AppShell from './AppShell';
import NoticeOpener from './notify/NoticeOpener';
import { notifications } from './notify/notifications';
import { directionBetween, markEnter, transition } from './transitions';
import { useShortcuts } from './shortcuts';
import OverlayProvider from './overlays/OverlayProvider';
import { useOverlays } from './overlays/OverlayContext';
import { NavigationContext, ReturnRouteContext, type NavigateOptions } from './navigationContext';
import { defaultRoute, routePaths, type AppRoute } from './routes/routeTypes';
import { hasOnboarded, markOnboarded, startLight } from '../data/storage/preferences';

const mainTabs: ReadonlySet<AppRoute> = new Set(['today', 'reflect', 'plan', 'calendar', 'capture', 'compass']);
const routeFromLocation = (): AppRoute => {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return (Object.entries(routePaths).find(([, routePath]) => routePath === path)?.[0] as AppRoute | undefined) ?? defaultRoute;
};

/** Lets a family app hand a short piece of text straight into Think it through. */
function UrlOverlayOpener() {
  const { openThinkThrough } = useOverlays();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('open') !== 'think-through') return;
    history.replaceState(history.state, '', window.location.pathname + window.location.hash);
    openThinkThrough(params.get('text') ? { text: params.get('text')! } : undefined);
  }, [openThinkThrough]);
  return null;
}

export default function App() {
  // Coming back from signing in (Google, Apple or the email's link) goes straight to the account, past the welcome.
  const [started, setStarted] = useState(() => {
    if (hasOnboarded()) return true;
    if (new URLSearchParams(location.search).get('open') !== 'account') return false;
    markOnboarded();
    startLight();
    return true;
  });
  const locked = useSyncExternalStore(lock.subscribe, lock.isLocked);
  useEffect(() => lock.watchAway(), []);
  useEffect(() => laterPages(), []);
  const [route, setRoute] = useState<AppRoute>(routeFromLocation);
  const current = useRef(route);
  current.current = route;
  // Every move between places slides the way it goes (see transitions.ts).
  const go = useCallback((next: AppRoute, options?: NavigateOptions) => {
    const from = current.current;
    if (next === from) return;
    if (options?.immediate) {
      setRoute(next);
      return;
    }
    // Main-tab changes keep the real dock out of the document view
    // transition. The page swaps beneath it while the dock and its indicator
    // stay anchored to the viewport.
    if (mainTabs.has(from) && mainTabs.has(next)) {
      // No snapshot: the new page fades in (opacity only, so Today's fixed landscape stays put).
      markEnter(directionBetween(from, next));
      setRoute(next);
      return;
    }
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
    // Pull to update (Lamplight): other calendars and the weather come along with the sync.
    const onPull = () => {
      void otherCalendars.refresh(true);
      void weather.refresh(true);
    };
    document.addEventListener('ll-refresh', onPull);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('ll-refresh', onPull);
    };
  }, []);

  if (!started) {
    return (
      <Suspense fallback={null}>
      <OnboardingPage
        onGetStarted={(next) => {
          markOnboarded();
          startLight();
          if (next) setRoute(next);
          setStarted(true);
        }}
      />
      </Suspense>
    );
  }

  return (
    <NavigationContext.Provider value={go}>
    <ReturnRouteContext.Provider value={lastTab}>
    <EdgeSwipe />
    <OverlayProvider>
      <UrlOverlayOpener />
      <NoticeOpener />
      <InboxOpener />
      <TrainingClash />
      <AppShell route={route} onNavigate={go}>
      <Suspense fallback={null}>
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
      </Suspense>
      </AppShell>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {shared && <SharedSheet text={shared} onClose={() => setShared(undefined)} />}
    </OverlayProvider>
    </ReturnRouteContext.Provider>
    </NavigationContext.Provider>
  );
}
