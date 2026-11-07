import { collection, stored } from '../../app/family/shell';
import { notifications } from '../../app/notify/notifications';
import { defaultUpkeepNotices, type UpkeepNoticeChoices } from '../core/notices';
import type { DistanceUnit, Thing, Upkeep } from '../core/things';

export type KtemaSettings = { started: boolean; notices: UpkeepNoticeChoices; distance: DistanceUnit };

const usesMiles = () => typeof navigator !== 'undefined' && /^en-(US|GB|LR|MM)/.test(navigator.language);

export const settings = stored<KtemaSettings>('ktema:settings', () => ({ started: false, notices: { ...defaultUpkeepNotices }, distance: usesMiles() ? 'mi' : 'km' }));
export const things = collection<Thing>('ktema:thing:');
export const upkeeps = collection<Upkeep>('ktema:upkeep:');

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

export function putThing(thing: Thing): void {
  things.put(thing);
  notifications.refreshSoon();
}

export function putUpkeep(upkeep: Upkeep): void {
  upkeeps.put(upkeep);
  notifications.refreshSoon();
}

/** A thing and its upkeep go together, and come back together with undo. */
export function removeThing(thing: Thing): () => void {
  const its = upkeeps.list().filter((upkeep) => upkeep.thingId === thing.id);
  things.remove(thing.id);
  its.forEach((upkeep) => upkeeps.remove(upkeep.id));
  notifications.refreshSoon();
  return () => {
    things.put(thing);
    its.forEach((upkeep) => upkeeps.put(upkeep));
    notifications.refreshSoon();
  };
}

export function removeUpkeep(id: string): void {
  upkeeps.remove(id);
  notifications.refreshSoon();
}
