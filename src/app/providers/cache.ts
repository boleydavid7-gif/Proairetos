import type { Capability } from '../../core/apps/manifest';
import { sourceChanged, type OutputOf, type Provider } from '../../core/providers';
import { onChangedCollections } from '../sync/syncController';

/*
 * A provider's result, kept in memory only (nothing is stored). It is dropped when a sync changes something the provider
 * reads (`sourceChanged`), when its own app changes records here (`provider.subscribe`), when the day turns over, or when
 * another window changes things. Each provider keeps its own entry, so one app's change never rebuilds another's.
 */
const wrapped = new Map<Provider, Provider>();

type Subscribe = (listener: (collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void) => () => void;

export function withCache<C extends Capability>(provider: Provider<C>, subscribe: Subscribe = onChangedCollections): Provider<C> {
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
    subscribe((collections, ids) => {
      if (sourceChanged(provider.sources, collections, ids)) drop();
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
