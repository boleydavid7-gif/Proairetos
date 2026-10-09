import { useEffect, useState } from 'react';
import MovedNotice from './MovedNotice';
import { navigation } from './navigation';
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

  return (
    <div className="app-shell" data-route={route}>
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

      <nav className="tab-bar" aria-label="Main navigation">
        <span className="tab-bar__brand" aria-hidden="true">
          Proairetos
        </span>
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="tab-bar__item"
            aria-current={id === route || (id === 'plan' && route === 'calendar') || (id === 'reflect' && route === 'meditate') ? 'page' : undefined}
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
