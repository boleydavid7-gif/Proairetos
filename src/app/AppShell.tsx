import { navigation } from './navigation';

type AppShellProps = {
  children?: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <span>Proairetos</span>
      </header>

      <main className="app-shell__content">
        {children}
      </main>

      <nav className="app-shell__nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <button key={item.id} type="button">
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
