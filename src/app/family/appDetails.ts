import { APPS } from '../../core/apps/manifest';
import type { FamilyApp } from './FamilyApps';

/**
 * What the Store shows under an app's description: what it adds to Proairetos (`adds`) and how it connects to other
 * apps (`connects`, named only where that app is added; the Store marks which are). Screenshots are the app's own.
 * Write full sentences and check each claim against the app first.
 */
export type AppDetail = {
  /** What the app adds to Proairetos itself (Today, Days ahead, Reflect, the Library, reminders). */
  adds: string;
  connects: readonly { app: FamilyApp; text: string }[];
  shots: number;
};

export const appDetails: Partial<Record<FamilyApp, AppDetail>> = Object.fromEntries(
  APPS.flatMap((app) => (app.details ? [[app.id, app.details] as const] : [])),
) as Partial<Record<FamilyApp, AppDetail>>;
