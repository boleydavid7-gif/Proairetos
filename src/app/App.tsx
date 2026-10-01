import { useState } from 'react';
import OnboardingPage from '../features/onboarding/OnboardingPage';
import NowPage from '../features/now/NowPage';
import CapturePage from '../features/capture/CapturePage';
import ReflectPage from '../features/reflect/ReflectPage';
import AppShell from './AppShell';
import { defaultRoute, type AppRoute } from './routes/routeTypes';

function RoutePlaceholder({ title }: { title: string }) {
  return (
    <header className="page-header">
      <h1 className="page-header__title">{title}</h1>
      <p className="page-header__subtitle">This space is not built yet.</p>
    </header>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [route, setRoute] = useState<AppRoute>(defaultRoute);

  if (!started) {
    return <OnboardingPage onGetStarted={() => setStarted(true)} />;
  }

  return (
    <AppShell route={route} onNavigate={setRoute}>
      {route === 'today' && <NowPage />}
      {route === 'reflect' && <ReflectPage />}
      {route === 'capture' && <CapturePage />}
      {route === 'compass' && <RoutePlaceholder title="Compass" />}
      {route === 'settings' && <RoutePlaceholder title="Settings" />}
    </AppShell>
  );
}
