import type { ReactNode } from 'react';
import { familyApps } from '../../app/family/FamilyApps';
import { FamilyMark, type FamilyApp } from '../../app/family/marks';

/**
 * One app's part of the Today overview: its mark and name, then the app's own current signal or actionable rows.
 * In compact mode the name and signal share one line, as in a pinned summary.
 */
export default function AppGroup({ app, name, children, compact = false }: { app: FamilyApp; name?: string; children: ReactNode; compact?: boolean }) {
  const label = name ?? familyApps.find((each) => each.id === app)?.name ?? app;
  return (
    <div className={`today-app${compact ? ' today-app--compact' : ''}`} data-app={app} role="group" aria-label={label}>
      <p className="today-app__name">
        <FamilyMark app={app} size={compact ? 20 : 16} />
        {label}
      </p>
      <div className={`today-group${compact ? ' today-app__content' : ''}`}>{children}</div>
    </div>
  );
}
