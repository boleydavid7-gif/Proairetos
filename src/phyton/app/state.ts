import { useEffect, useSyncExternalStore } from 'react';
import { collection, stored } from '../../app/family/shell';
import { createSharedLists, joinProof, sharingAvailable, type SharedListRef } from '../../app/family/sharedLists';
import { notifications } from '../../app/notify/notifications';
import { displayName } from '../../data/storage/preferences';
import { defaultPlantNotices, type PlantNoticeChoices } from '../core/notices';
import type { Hemisphere, Plant } from '../core/plants';

export type PhytonSettings = { started: boolean; me: string; notices: PlantNoticeChoices; hemisphere: Hemisphere; rain: boolean };

/** The name used for Mine and for who watered: the one given here, else the name set in Proairetos. */
export function myName(current: PhytonSettings = settings.load()): string {
  return current.me.trim() || displayName();
}

/** South of the equator by the phone's time zone, as a first guess; changeable in More. */
function guessHemisphere(): Hemisphere {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    return /^(Australia|Antarctica|Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Noumea)|America\/(Argentina|Santiago|Sao_Paulo|Montevideo|Asuncion|La_Paz|Lima)|Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Maseru|Mbabane|Lusaka)|Indian\/(Mauritius|Reunion|Antananarivo))/.test(zone) ? 'south' : 'north';
  } catch {
    return 'north';
  }
}

export const settings = stored<PhytonSettings>('phyton:settings', () => ({ started: false, me: '', notices: { ...defaultPlantNotices }, hemisphere: guessHemisphere(), rain: false }));

/** Plants kept on this phone (and in the person's own account) while there is no shared home. */
export const ownPlants = collection<Plant>('phyton:plant:');

/** A shared home: every plant sealed with the home's key; everyone with the invite sees and waters them. */
export const homes = createSharedLists<Plant>({
  listsKey: 'phyton:homes',
  cachePrefix: 'phytonShared',
  label: 'phyton-list',
  order: (a, b) => a.createdAt.localeCompare(b.createdAt),
  defaultName: 'Home',
});

export { joinProof, sharingAvailable };

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

export function home(): SharedListRef | undefined {
  return homes.sharedLists()[0];
}

let homeCache: { version: number; value: SharedListRef | undefined; items: Plant[] } | undefined;
function snapshot() {
  const version = homes.sharedVersion();
  if (!homeCache || homeCache.version !== version) {
    const value = home();
    homeCache = { version, value, items: value ? homes.sharedItems(value) : [] };
  }
  return homeCache;
}

export function useHome(): SharedListRef | undefined {
  return useSyncExternalStore(homes.subscribeShared, () => snapshot().value);
}

/** Every plant to show: the shared home's while there is one, else this phone's own. */
export function usePlants(): Plant[] {
  const own = ownPlants.use();
  const shared = useSyncExternalStore(homes.subscribeShared, () => snapshot());
  useEffect(() => {
    const list = shared.value;
    if (!list) return;
    const pull = () => document.visibilityState === 'visible' && void homes.refreshList(list).catch(() => undefined);
    pull();
    const timer = window.setInterval(pull, 15_000);
    document.addEventListener('visibilitychange', pull);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pull);
    };
  }, [shared.value?.id]);
  return shared.value ? shared.items : own;
}

export function allPlants(): Plant[] {
  const list = home();
  return list ? homes.sharedItems(list) : ownPlants.list();
}

export function putPlant(plant: Plant): void {
  const list = home();
  if (list) homes.changeItem(list, plant.id, plant);
  else ownPlants.put(plant);
  notifications.refreshSoon();
}

export function removePlant(id: string): void {
  const list = home();
  if (list) homes.changeItem(list, id, null);
  else ownPlants.remove(id);
  notifications.refreshSoon();
}

export function findPlant(id: string): Plant | undefined {
  return allPlants().find((plant) => plant.id === id);
}
