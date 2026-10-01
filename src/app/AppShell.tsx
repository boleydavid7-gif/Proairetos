import { navigation } from './navigation';
import type { AppRoute } from './routes/routeTypes';

type AppShellProps = {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children?: React.ReactNode;
};

export default function AppShell({ route, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <main className="app-shell__content">{children}</main>

      <nav className="app-shell__nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <button
            key={item.id}
            type="button"
            className="app-shell__nav-item"
            aria-current={item.id === route ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
