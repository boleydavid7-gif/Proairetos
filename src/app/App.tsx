import EdgeSwipe from './back/EdgeSwipe';
import { useEffect, useState } from 'react';
import { startSync } from './sync/syncController';
import OnboardingPage from '../features/onboarding/OnboardingPage';
import NowPage from '../features/now/NowPage';
import CapturePage from '../features/capture/CapturePage';
import ReflectPage from '../features/reflect/ReflectPage';
import CompassPage from '../features/compass/CompassPage';
import ScheduleScreen from '../features/schedule/ScheduleScreen';
import WeeklyReview from '../features/review/WeeklyReview';
import SettingsPage from '../features/settings/SettingsPage';
import PlanPage from '../features/plan/PlanPage';
import JournalPage from '../features/journal/JournalPage';
import InsightsPage from '../features/insights/InsightsPage';
import AppShell from './AppShell';
import OverlayProvider from './overlays/OverlayProvider';
import { NavigationContext, ReturnRouteContext } from './navigationContext';
import { defaultRoute, type AppRoute } from './routes/routeTypes';
import { hasOnboarded, markOnboarded } from '../data/storage/preferences';

const mainTabs: ReadonlySet<AppRoute> = new Set(['today', 'reflect', 'plan', 'capture', 'compass']);

export default function App() {
  const [started, setStarted] = useState(hasOnboarded);
  const [route, setRoute] = useState<AppRoute>(defaultRoute);
  const [lastTab, setLastTab] = useState<AppRoute>(defaultRoute);

  useEffect(() => {
    if (mainTabs.has(route)) setLastTab(route);
  }, [route]);

  useEffect(() => {
    void startSync();
  }, []);

  if (!started) {
    return (
      <OnboardingPage
        onGetStarted={(next) => {
          markOnboarded();
          if (next) setRoute(next);
          setStarted(true);
        }}
      />
    );
  }

  return (
    <NavigationContext.Provider value={setRoute}>
    <ReturnRouteContext.Provider value={lastTab}>
    <EdgeSwipe />
    <OverlayProvider>
      <AppShell route={route} onNavigate={setRoute}>
      {route === 'today' && <NowPage />}
      {route === 'reflect' && <ReflectPage />}
      {route === 'capture' && <CapturePage />}
      {route === 'compass' && <CompassPage />}
      {route === 'schedule' && <ScheduleScreen />}
      {route === 'review' && <WeeklyReview />}
      {route === 'settings' && <SettingsPage />}
      {route === 'plan' && <PlanPage />}
      {route === 'journal' && <JournalPage />}
      {route === 'insights' && <InsightsPage />}
      </AppShell>
    </OverlayProvider>
    </ReturnRouteContext.Provider>
    </NavigationContext.Provider>
  );
}
