import { APPS } from '../../core/apps/manifest';
import type { CalendarLine, Provider } from '../../core/providers';
import { subscribePreferences } from '../../data/storage/preferences';
import { subscribeAdded, isAdded } from '../family/added';
import { onChangedCollections } from '../sync/syncController';
import { hostContext, providerEnabled } from './context';
import { createCalendarStore, type CalendarRange } from './calendarStore';
import { providerModules } from './registry';

/** The one calendar store: Days ahead, Today's timeline and open time read the apps' calendar providers through it. */
export const calendarStore = createCalendarStore({
  manifest: APPS,
  load: async (app) => {
    const load = providerModules[app];
    return load ? ((await load()).providers.filter((provider) => provider.capability === 'calendar') as Provider<'calendar'>[]) : [];
  },
  context: (range, now) => ({ ...hostContext(now), range }),
  usable: (app) => isAdded(app),
  enabled: (app) => providerEnabled(app, 'calendar'),
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

export type { CalendarLine, CalendarRange };
