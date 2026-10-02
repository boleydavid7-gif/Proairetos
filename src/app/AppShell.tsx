import { useEffect, useState } from 'react';
import MovedNotice from './MovedNotice';
import { navigation } from './navigation';
import { useTodayParts } from './hooks/useTodayParts';
import { storageMode } from './services';
import type { AppRoute } from './routes/routeTypes';

type AppShellProps = {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children?: React.ReactNode;
};

function useStorageMode() {
  const [mode, setMode] = useState<'device' | 'memory'>('device');
  useEffect(() => {
    storageMode.then(setMode);
  }, []);
  return mode;
}

export default function AppShell({ route, onNavigate, children }: AppShellProps) {
  const mode = useStorageMode();
  const shows = useTodayParts();
  // Meditate can be switched off in Settings > What's included.
  const tabs = navigation.filter(({ id }) => id !== 'meditate' || shows('meditate'));

  return (
    <div className="app-shell">
      <main className="app-shell__content">
        <MovedNotice />
        {mode === 'memory' && (
          <p className="storage-notice" role="status">
            This browser is not letting Proairetos save. What you add stays until this tab closes.
          </p>
        )}
        {/* Each page fades in; keyed so a new route starts fresh. */}
        <div key={route} className="page-enter">
          {children}
        </div>
      </main>

      <nav className="tab-bar" aria-label="Main navigation" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="tab-bar__item"
            aria-current={id === route || (id === 'plan' && route === 'calendar') ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={24} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
