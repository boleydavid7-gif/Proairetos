import { APPS } from '../../core/apps/manifest';
import type { HostContext } from '../../core/providers';
import { toLocalDate } from '../../core/scheduling/dates';
import { providerSwitches } from '../../data/storage/preferences';
import type { stores } from '../../data/storage/indexeddb/database';
import { isAdded } from '../family/added';
import { readStore } from '../family/read';

/** Whether an app's capability is on: what the person chose, else the manifest's default (search is on unless `defaultOn` is false). */
export function providerEnabled(app: string, capability: string, switches = providerSwitches()): boolean {
  const key = `${app}:${capability}`;
  if (switches.on.includes(key)) return true;
  if (switches.off.includes(key)) return false;
  if (capability === 'search') return APPS.find((each) => each.id === app)?.search?.defaultOn !== false;
  return true;
}

export function hostContext(now = new Date()): HostContext {
  const switches = providerSwitches();
  return {
    today: toLocalDate(now),
    now,
    records: (source) => readStore(source as keyof typeof stores),
    setting: (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    isUsable: (app) => isAdded(app),
    enabled: (app, capability) => providerEnabled(app, capability, switches),
  };
}
