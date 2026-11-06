import { useMemo, useSyncExternalStore } from 'react';
import { APPS, type AppId } from '../../core/apps/manifest';
import type { HomeRow, Provider } from '../../core/providers';
import { loadDaySettings, subscribePreferences } from '../../data/storage/preferences';
import { scheduleBetween } from '../../askesis/data/proairetosSchedule';
import { subscribeAdded, isAdded } from '../family/added';
import { onChangedCollections } from '../sync/syncController';
import { hostContext, providerEnabled } from './context';
import { createHomeStore, type HomeDay } from './homeStore';
import { providerModules } from './registry';

/** The apps that have something to put on Today (the manifest's `provides`), in Today's order. */
export const HOME_APPS: readonly AppId[] = APPS.filter((app) => app.status !== 'retired' && app.provides?.includes('home')).sort((a, b) => (a.today?.order ?? 99) - (b.today?.order ?? 99)).map((app) => app.id);

export const homeStore = createHomeStore({
  manifest: APPS,
  load: async (app) => {
    const load = providerModules[app];
    return load ? ((await load()).providers.filter((provider) => provider.capability === 'home') as Provider<'home'>[]) : [];
  },
  context: (day, now) => ({
    ...hostContext(now),
    today: day.today,
    day: { start: day.start, end: day.end },
    schedule: (from, until) => scheduleBetween(from, until),
    daySettings: loadDaySettings,
  }),
  usable: (app) => isAdded(app),
  enabled: (app) => providerEnabled(app, 'home'),
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

/** One app's lines of a group, read from the apps' providers; Today's day tells the store which day to derive. */
export function useHomeRows(group: HomeRow['group'], day: HomeDay): HomeRow[] {
  const key = `${day.today}|${day.start.getTime()}|${day.end.getTime()}`;
  useMemo(() => homeStore.setDay(day), [key]);
  const version = useSyncExternalStore(homeStore.subscribe, homeStore.version);
  return useMemo(() => homeStore.rows(group), [version, group]);
}

/** Pulls a line to the left: marks its thing in its own app and gives back the undo. */
export function markHomeRow(row: HomeRow, today: string): () => void {
  const provider = homeStore.provider(row.ref.app);
  return provider?.act?.(row.ref, today) ?? (() => undefined);
}
