import type { Capability } from '../../core/apps/manifest';
import { sourceChanged, type OutputOf, type Provider } from '../../core/providers';
import { onChangedCollections } from '../sync/syncController';

/*
 * A provider's result, kept in memory only (nothing is stored). It is dropped when a sync changes something the provider
 * reads (`sourceChanged`), when its own app changes records here (`provider.subscribe`), when the day turns over, or when
 * another window changes things. Each provider keeps its own entry, so one app's change never rebuilds another's. A result
 * is also rebuilt after five minutes, a bound on staleness for a change no event reached this tab.
 */
export const MAX_AGE_MS = 5 * 60_000;
const wrapped = new Map<Provider, Provider>();

type Subscribe = (listener: (collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void) => () => void;

export function withCache<C extends Capability>(provider: Provider<C>, subscribe: Subscribe = onChangedCollections): Provider<C> {
  const known = wrapped.get(provider as Provider);
  if (known) return known as Provider<C>;
  let value: Awaited<OutputOf<C>> | undefined;
  let day = '';
  let stale = true;
  let started = false;
  let at = 0;
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
      if (stale || value === undefined || day !== ctx.today || ctx.now.getTime() - at > MAX_AGE_MS) {
        stale = false;
        day = ctx.today;
        at = ctx.now.getTime();
        const began = performance.now();
        value = (await provider.read(ctx)) as Awaited<OutputOf<C>>;
        // A named mark per real derivation, with its time: how often providers run, and for how long, can be read from the page.
        try {
          performance.mark(`provider-derive:${provider.app}`, { detail: { ms: Math.round((performance.now() - began) * 100) / 100 } });
        } catch {
          // Marking is optional.
        }
      }
      return value;
    },
  };
  wrapped.set(provider as Provider, cached as Provider);
  return cached;
}
