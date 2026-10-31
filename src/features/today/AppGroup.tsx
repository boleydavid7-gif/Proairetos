import type { ReactNode } from 'react';
import { familyApps } from '../../app/family/FamilyApps';
import { FamilyMark, type FamilyApp } from '../../app/family/marks';

/**
 * One app's part of From your apps: its mark and name, then its rows in their own inset list. A group with nothing in
 * it today takes no room (`.today-app:not(:has(...))` in premium.css), so each app's piece can render itself.
 */
export default function AppGroup({ app, name, children }: { app: FamilyApp; name?: string; children: ReactNode }) {
  const label = name ?? familyApps.find((each) => each.id === app)?.name ?? app;
  return (
    <div className="today-app" role="group" aria-label={label}>
      <p className="today-app__name">
        <FamilyMark app={app} size={16} />
        {label}
      </p>
      <div className="today-group">{children}</div>
    </div>
  );
}
