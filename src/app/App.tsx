import { useState } from 'react';
import OnboardingPage from '../features/onboarding/OnboardingPage';
import NowPage from '../features/now/NowPage';
import CapturePage from '../features/capture/CapturePage';
import ReflectPage from '../features/reflect/ReflectPage';
import CompassPage from '../features/compass/CompassPage';
import PageHeader from '../components/layout/PageHeader';
import AppShell from './AppShell';
import OverlayProvider from './overlays/OverlayProvider';
import { NavigationContext } from './navigationContext';
import { defaultRoute, type AppRoute } from './routes/routeTypes';
import { hasOnboarded, markOnboarded } from '../data/storage/preferences';

function RoutePlaceholder({ title }: { title: string }) {
  return <PageHeader title={title} subtitle="This space is not built yet." />;
}

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
      {route === 'settings' && <RoutePlaceholder title="Settings" />}
      </AppShell>
    </OverlayProvider>
    </NavigationContext.Provider>
  );
}
