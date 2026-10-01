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
