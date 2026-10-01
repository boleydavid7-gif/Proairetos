import { useState } from 'react';
import OnboardingPage from '../features/onboarding/OnboardingPage';
import NowPage from '../features/now/NowPage';
import AppShell from './AppShell';
import { defaultRoute, type AppRoute } from './routes/routeTypes';

function RoutePlaceholder({ title }: { title: string }) {
  return (
    <header className="now-header">
      <h1 className="now-header__title">{title}</h1>
      <p className="now-header__subtitle">This space is not built yet.</p>
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
      {route === 'now' && <NowPage />}
      {route === 'day' && <RoutePlaceholder title="Day" />}
      {route === 'life' && <RoutePlaceholder title="Life" />}
      {route === 'reflect' && <RoutePlaceholder title="Reflect" />}
      {route === 'settings' && <RoutePlaceholder title="Settings" />}
    </AppShell>
  );
}
