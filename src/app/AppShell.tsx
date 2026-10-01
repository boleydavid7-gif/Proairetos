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
    <div className="app-shell">
      <main className="app-shell__content">
        <MovedNotice />
        {mode === 'memory' && (
          <p className="storage-notice" role="status">
            This browser is not letting Proairetos save. What you add stays until this tab closes.
          </p>
        )}
        {children}
      </main>

      <nav className="tab-bar" aria-label="Main navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="tab-bar__item"
            aria-current={id === route ? 'page' : undefined}
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
