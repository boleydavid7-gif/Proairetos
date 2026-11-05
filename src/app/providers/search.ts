import { APPS } from '../../core/apps/manifest';
import { refKey, searchProjections, type Provider } from '../../core/providers';
import type { Searchable } from '../../core/search/search';
import { withCache } from './cache';
import { hostContext, providerEnabled } from './context';
import { providerModules } from './registry';

/** What the providers contribute to universal search, as the search sheet's own rows. Only apps that are added and switched on are even loaded. */
export async function providerSearch(): Promise<{ things: Searchable[]; labels: Map<string, string> }> {
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
  const { results } = await searchProjections(providers, APPS, ctx);
  const labels = new Map<string, string>();
  const things: Searchable[] = results.map((projection) => {
    const id = refKey(projection.ref);
    labels.set(id, projection.label);
    return { id, kind: 'app', title: projection.title, fields: projection.fields.map((field) => ({ name: field.name, text: field.text })), at: projection.at, href: projection.open };
  });
  return { things, labels };
}
