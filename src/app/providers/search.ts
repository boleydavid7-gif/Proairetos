import { APPS } from '../../core/apps/manifest';
import { refKey, searchProjections, type Provider } from '../../core/providers';
import type { Searchable } from '../../core/search/search';
import { withCache } from './cache';
import { hostContext, providerEnabled } from './context';
import { providerModules } from './registry';

/** What the providers contribute to universal search, as the search sheet's own rows. Only apps that are added and switched on are even loaded. */
export type ProvidedSearch = { things: Searchable[]; labels: Map<string, string>; timings: { app: string; ms: number; rows: number }[]; totalMs: number };

export const noProvidedSearch: ProvidedSearch = { things: [], labels: new Map(), timings: [], totalMs: 0 };

let last: ProvidedSearch = noProvidedSearch;
/** What the last run took, for measuring. */
export const lastProvidedSearch = () => last;

export async function providerSearch(): Promise<ProvidedSearch> {
  const started = performance.now();
  const ctx = hostContext();
  const providers: Provider<'search'>[] = [];
  for (const app of APPS) {
    if (!app.provides?.includes('search') || !ctx.isUsable(app.id) || !providerEnabled(app.id, 'search')) continue;
    const load = providerModules[app.id];
    if (!load) continue;
    for (const provider of (await load()).providers) {
      if (provider.capability === 'search') providers.push(withCache(provider as Provider<'search'>));
    }
  }
  const { results, timings } = await searchProjections(providers, APPS, ctx);
  const labels = new Map<string, string>();
  const things: Searchable[] = results.map((projection) => {
    const id = refKey(projection.ref);
    labels.set(id, projection.label);
    return { id, kind: 'app', title: projection.title, fields: projection.fields.map((field) => ({ name: field.name, text: field.text })), at: projection.at, href: projection.open };
  });
  last = { things, labels, timings, totalMs: Math.round((performance.now() - started) * 100) / 100 };
  return last;
}
