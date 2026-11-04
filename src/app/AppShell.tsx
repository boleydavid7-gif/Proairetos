import { useEffect, useState } from 'react';
import MovedNotice from './MovedNotice';
import AppsTab from '../components/layout/AppsTab';
import { navigation } from './navigation';
import { storageMode } from './services';
import type { AppRoute } from './routes/routeTypes';
import PwaStatus from './pwa/PwaStatus';
import { SearchIcon, GearIcon, BookIcon } from '../components/icons/Icons';

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

  // Match the family's page navigation: each top-level place starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  return (
    <div className="app-shell" data-route={route}>
      <main className="app-shell__content">
        <PwaStatus />
        <MovedNotice />
        {mode === 'memory' && (
          <p className="storage-notice" role="status">
            This browser isn’t letting Proairetos save. What you add stays until this tab closes.
          </p>
        )}
        {/* Each page fades in; keyed so a new route starts fresh. */}
        <div key={route} className="page-enter">
          {children}
        </div>
      </main>

      <nav className="tab-bar" aria-label="Main navigation">
        <a className="tab-bar__brand" href="/" aria-label="Proairetos">
          <img src="/icons/icon.svg" alt="" width="30" height="30" />
          <span>Proairetos</span>
        </a>
        <a className="tab-bar__search" href="/?open=search" aria-label="Search">
          <SearchIcon size={22} /><span>Search</span><kbd>⌘ K</kbd>
        </a>
        <span className="tab-bar__section-label">Workspace</span>
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="tab-bar__item"
            aria-current={id === route || (id === 'plan' && route === 'calendar') || (id === 'reflect' && (route === 'meditate' || route === 'compass' || route === 'connections')) ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={24} />
            <span>{label}</span>
          </button>
        ))}
        <span className="tab-bar__section-label tab-bar__resources-label">Resources</span>
        <a className="tab-bar__item tab-bar__resource tab-bar__desktop-only" href="/?open=connections"><BookIcon size={22} /><span>Library</span></a>
        <a className="tab-bar__item tab-bar__resource tab-bar__desktop-only" href="/?open=account"><GearIcon size={22} /><span>Settings</span></a>
        <AppsTab />
      </nav>
    </div>
  );
}
