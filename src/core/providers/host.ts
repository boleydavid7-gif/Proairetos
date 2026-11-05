import type { AppManifest } from '../apps/manifest';
import { enforceSearch, mayProvideSearch, type Rejection } from './policy';
import type { Provider, ProviderContext, SearchProjection } from './types';

/*
 * The one caller of providers. It checks that the app is added and usable, that the person has this capability on,
 * and that the manifest allows it, runs the provider, and cuts the output down to what the manifest permits.
 */

export type HostContext = ProviderContext & {
  /** The app is added in the Store and may be used (trial or bought). */
  isUsable(app: string): boolean;
  /** The person's switch for this app and capability (the default when never chosen). */
  enabled(app: string, capability: string): boolean;
};

export type SearchOutcome = { results: SearchProjection[]; rejected: Rejection[]; /** How long each provider that ran took, in milliseconds. */ timings: { app: string; ms: number; rows: number }[] };

export async function searchProjections(providers: readonly Provider<'search'>[], manifest: readonly AppManifest[], ctx: HostContext): Promise<SearchOutcome> {
  const results: SearchProjection[] = [];
  const rejected: Rejection[] = [];
  const timings: SearchOutcome['timings'] = [];
  for (const provider of providers) {
    const app = manifest.find((each) => each.id === provider.app);
    const refusal = mayProvideSearch(app, provider);
    if (refusal) {
      rejected.push(refusal);
      continue;
    }
    if (!ctx.isUsable(provider.app) || !ctx.enabled(provider.app, 'search')) continue;
    let output: SearchProjection[];
    const started = performance.now();
    try {
      output = await provider.read(ctx);
    } catch (error) {
      rejected.push({ app: provider.app, reason: `its provider could not read: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    const cut = enforceSearch(app!, output, ctx.today);
    timings.push({ app: provider.app, ms: Math.round((performance.now() - started) * 100) / 100, rows: cut.kept.length });
    results.push(...cut.kept);
    rejected.push(...cut.rejected);
  }
  return { results, rejected, timings };
}
