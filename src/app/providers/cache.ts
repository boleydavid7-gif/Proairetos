import type { OutputOf, Provider } from '../../core/providers';
import type { Capability } from '../../core/apps/manifest';
import { onChangedCollections } from '../sync/syncController';

/*
 * A provider's result, kept in memory only (nothing is stored). It is dropped when a sync changes a collection the
 * provider reads, when its own app changes records here, when the day turns over, or when another window changes things.
 */
const wrapped = new Map<Provider, Provider>();

export function withCache<C extends Capability>(provider: Provider<C>, subscribe: (listener: (collections: readonly string[]) => void) => () => void = onChangedCollections): Provider<C> {
  const known = wrapped.get(provider as Provider);
  if (known) return known as Provider<C>;
  let value: Awaited<OutputOf<C>> | undefined;
  let day = '';
  let stale = true;
  let started = false;
  const drop = () => {
    stale = true;
  };
  const start = () => {
    if (started) return;
    started = true;
    subscribe((collections) => {
      if (collections.includes('*') || collections.some((name) => provider.sources.includes(name)) || (collections.includes('preferences') && provider.sources.some((source) => source.startsWith('setting:')))) drop();
    });
    provider.subscribe?.(drop);
  };
  const cached: Provider<C> = {
    ...provider,
    async read(ctx) {
      start();
      if (stale || value === undefined || day !== ctx.today) {
        stale = false;
        day = ctx.today;
        value = (await provider.read(ctx)) as Awaited<OutputOf<C>>;
      }
      return value;
    },
  };
  wrapped.set(provider as Provider, cached as Provider);
  return cached;
}
