import { useMemo, useSyncExternalStore } from 'react';
import { APPS } from '../../core/apps/manifest';
import type { LifeRecord } from '../../core/life-records/contract';
import type { Provider } from '../../core/providers';
import { subscribePreferences } from '../../data/storage/preferences';
import { subscribeAdded, isAdded } from '../family/added';
import { onChangedCollections } from '../sync/syncController';
import { hostContext, providerEnabled } from './context';
import { libraryProvidersOn } from './libraryPath';
import { createLibraryStore } from './libraryStore';
import { providerModules } from './registry';

export const libraryStore = createLibraryStore({
  manifest: APPS,
  load: async (app) => {
    const load = providerModules[app];
    return load ? ((await load()).providers.filter((provider) => provider.capability === 'library') as Provider<'library'>[]) : [];
  },
  context: (now) => hostContext(now),
  usable: (app) => isAdded(app),
  enabled: (app) => providerEnabled(app, 'library'),
  onSynced: onChangedCollections,
  onChoices: (listener) => {
    const offAdded = subscribeAdded(listener);
    const offPreferences = subscribePreferences(listener);
    return () => {
      offAdded();
      offPreferences();
    };
  },
  now: () => new Date(),
});

const noSubscription = () => () => undefined;

/**
 * What the Library lists. With the device switch off, exactly the entries it was given, the same array, and the store is not started.
 * On, the entries of Proairetos itself (`own`) with those the apps give through their providers, an app that is not added and usable
 * left out together with the reflections written from its prompts. Nothing is stored; the entries are rebuilt from records on the device.
 */
export function useLibraryRecords(own: readonly LifeRecord[]): readonly LifeRecord[] {
  const on = libraryProvidersOn();
  const version = useSyncExternalStore(on ? libraryStore.subscribe : noSubscription, on ? libraryStore.version : () => 0);
  return useMemo(() => (on ? libraryStore.visible(own) : own), [on, version, own]);
}
