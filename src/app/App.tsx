import { useState } from 'react';
import OnboardingPage from '../features/onboarding/OnboardingPage';
import NowPage from '../features/now/NowPage';
import CapturePage from '../features/capture/CapturePage';
import ReflectPage from '../features/reflect/ReflectPage';
import CompassPage from '../features/compass/CompassPage';
import ScheduleScreen from '../features/schedule/ScheduleScreen';
import WeeklyReview from '../features/review/WeeklyReview';
import SettingsPage from '../features/settings/SettingsPage';
import AppShell from './AppShell';
import OverlayProvider from './overlays/OverlayProvider';
import { NavigationContext } from './navigationContext';
import { defaultRoute, type AppRoute } from './routes/routeTypes';
import { hasOnboarded, markOnboarded } from '../data/storage/preferences';

export default function App() {
  const [started, setStarted] = useState(hasOnboarded);
  const [route, setRoute] = useState<AppRoute>(defaultRoute);

  if (!started) {
    return (
      <OnboardingPage
        onGetStarted={() => {
          markOnboarded();
          setStarted(true);
        }}
      />
    );
  }

  return (
    <NavigationContext.Provider value={setRoute}>
    <OverlayProvider>
      <AppShell route={route} onNavigate={setRoute}>
      {route === 'today' && <NowPage />}
      {route === 'reflect' && <ReflectPage />}
      {route === 'capture' && <CapturePage />}
      {route === 'compass' && <CompassPage />}
      {route === 'schedule' && <ScheduleScreen />}
      {route === 'review' && <WeeklyReview />}
      {route === 'settings' && <SettingsPage />}
      </AppShell>
    </OverlayProvider>
    </NavigationContext.Provider>
  );
}
