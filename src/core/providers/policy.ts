import type { AppManifest } from '../apps/manifest';
import { refKey, type Provider, type SearchProjection } from './types';

/*
 * The enforcement. A provider is not trusted: whatever it returns is cut down to what the manifest allows for its app
 * before anything else sees it. Unknown fields are rejected, not passed through.
 */

export type Rejection = { app: string; reason: string };

const DAY = 86_400_000;

const dayOf = (value: string): string => value.slice(0, 10);

/** The first day inside a rolling window of `days` days ending today (today counts as day one). */
export function windowStart(today: string, days: number): string {
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - (days - 1) * DAY).toISOString().slice(0, 10);
}

/** Whether a provider's output is allowed to reach universal search at all. */
export function mayProvideSearch(app: AppManifest | undefined, provider: Provider<'search'>): Rejection | null {
  if (!app) return { app: provider.app, reason: 'not in the manifest' };
  if (app.status === 'retired') return { app: app.id, reason: 'retired apps provide nothing' };
  if (!app.provides?.includes('search')) return { app: app.id, reason: 'the manifest does not list search for this app' };
  if (!app.search) return { app: app.id, reason: 'its search fields are not classified' };
  // Private never leaves its app, and shared is not built yet: only the person's own search is open.
  if (provider.privacy !== 'own-search' || app.search.privacy !== 'own-search') return { app: app.id, reason: `class ${provider.privacy} is not available to universal search` };
  return null;
}

/** Cuts a provider's search output down to the manifest's allowed fields and window. */
export function enforceSearch(app: AppManifest, projections: readonly SearchProjection[], today: string): { kept: SearchProjection[]; rejected: Rejection[] } {
  const rules = app.search!;
  const allowed = new Set(rules.indexes);
  const excluded = new Set(rules.excludes);
  const rejected: Rejection[] = [];
  const kept: SearchProjection[] = [];
  const start = rules.windowDays ? windowStart(today, rules.windowDays) : undefined;
  const seen = new Set<string>();
  for (const projection of projections) {
    if (projection.ref.app !== app.id) {
      rejected.push({ app: app.id, reason: `a record that belongs to ${projection.ref.app}` });
      continue;
    }
    if (!allowed.has(projection.titleField) || excluded.has(projection.titleField)) {
      rejected.push({ app: app.id, reason: `title field "${projection.titleField}" is not allowed` });
      continue;
    }
    if (start && dayOf(projection.at) < start) continue;
    const key = refKey(projection.ref);
    if (seen.has(key)) {
      rejected.push({ app: app.id, reason: `the same record twice (${key})` });
      continue;
    }
    seen.add(key);
    const fields = projection.fields.filter((field) => {
      if (allowed.has(field.name) && !excluded.has(field.name)) return true;
      rejected.push({ app: app.id, reason: `field "${field.name}" is not allowed` });
      return false;
    });
    kept.push({ ...projection, fields });
  }
  return { kept, rejected };
}
