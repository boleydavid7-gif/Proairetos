import { useEffect } from 'react';
import { createSharedLists, sharingAvailable, type SharedListRef } from '../../app/family/sharedLists';
import { fingerprint, mergeRecords, type SyncRecord } from '../../app/family/recordMerge';
import { householdActor, householdLists } from '../../app/household/household';
import type { Thing, Upkeep, UpkeepDone } from '../core/things';
import { things, upkeeps } from './state';

/*
 * Things and upkeep shared with the household (Settings > Household > Things and upkeep). The household's list for
 * this app holds one sealed item per thing and per upkeep; each phone keeps its own records as always and, while a
 * list is the household's, brings them into step with the shared copy (`mergeRecords`: the side that changed wins, a
 * removal carries across). Things of kind Documents (and the upkeep of one) are never shared, nor are photos and files,
 * which stay on the device. A done upkeep says who did it.
 */
export type Shared = { id: string; kind: 'thing' | 'upkeep'; record: SyncRecord['record'] & (Thing | Upkeep) };

export const ktemaLists = createSharedLists<Shared>({
  listsKey: 'ktema:household',
  cachePrefix: 'ktemaShared',
  label: 'ktema-list',
  defaultName: 'Things',
});

export { sharingAvailable };

/** A shared item is sealed under a size the server allows: the latest of a long history go, the older stay on each phone. */
export const HISTORY_SHARED = 12;
export const READINGS_SHARED = 20;
const sharedId = (kind: Shared['kind'], id: string) => `${kind}:${id}`;
const seenKey = (listId: string) => `ktemaShared.seen.${listId}`;
const readSeen = (listId: string): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(seenKey(listId)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
};

/** The household's list for this app on this phone, if it has one. */
export function householdList(): SharedListRef | undefined {
  const ids = householdLists('ktema')?.ids ?? [];
  return ktemaLists.sharedLists().find((list) => ids.includes(list.id));
}

/** Who is acting, when the things are the household's; else no name is written. */
export const actingMember = (): string | undefined => (householdList() ? householdActor('ktema')?.name : undefined);

export const upkeepForSharing = (upkeep: Upkeep): Upkeep => ({ ...upkeep, history: upkeep.history.slice(-HISTORY_SHARED) });
export const thingForSharing = (thing: Thing): Thing => ({ ...thing, readings: thing.readings?.slice(-READINGS_SHARED) });

/** Another person's copy of an upkeep, with this phone's older history (before the shared window) kept. */
export function withOlderHistory(theirs: Upkeep, mine: Upkeep | undefined): Upkeep {
  if (!mine || theirs.history.length < HISTORY_SHARED) return theirs;
  const oldest = theirs.history[0]?.date ?? '';
  const older: UpkeepDone[] = mine.history.filter((done) => done.date < oldest);
  return { ...theirs, history: [...older, ...theirs.history] };
}

/** Documents are the person's own; so is the upkeep of one. */
const sharedThings = (): Thing[] => things.list().filter((thing) => thing.category !== 'Documents');

export function localRecords(): Map<string, Shared> {
  const out = new Map<string, Shared>();
  const own = sharedThings();
  const ids = new Set(own.map((thing) => thing.id));
  const privateIds = new Set(things.list().filter((thing) => thing.category === 'Documents').map((thing) => thing.id));
  for (const thing of own) out.set(sharedId('thing', thing.id), { id: sharedId('thing', thing.id), kind: 'thing', record: thingForSharing(thing) });
  for (const upkeep of upkeeps.list()) {
    if (upkeep.thingId && (privateIds.has(upkeep.thingId) || !ids.has(upkeep.thingId))) continue;
    out.set(sharedId('upkeep', upkeep.id), { id: sharedId('upkeep', upkeep.id), kind: 'upkeep', record: upkeepForSharing(upkeep) });
  }
  return out;
}

const running = new Map<string, Promise<void>>();

/** Brings the shared copy and this phone's things and upkeep into step, in both directions. */
export function syncHousehold(list: SharedListRef): Promise<void> {
  const already = running.get(list.id);
  if (already) return already;
  const work = (async () => {
    await ktemaLists.refreshList(list);
    const local = localRecords();
    const shared = new Map(ktemaLists.sharedItems(list).map((item) => [item.id, item]));
    const merge = mergeRecords(local, shared, readSeen(list.id));

    for (const item of merge.toLocal) {
      if (item.kind === 'thing') {
        const mine = things.list().find((each) => each.id === item.record.id);
        things.put({ ...(item.record as Thing), readings: mergeReadings(item.record as Thing, mine) });
      } else {
        upkeeps.put(withOlderHistory(item.record as Upkeep, upkeeps.list().find((each) => each.id === item.record.id)));
      }
    }
    for (const item of merge.removeLocal) {
      if (item.kind === 'thing') things.remove(item.record.id);
      else upkeeps.remove(item.record.id);
    }
    for (const item of merge.toShared) ktemaLists.changeItem(list, item.id, item);
    for (const id of merge.removeShared) ktemaLists.changeItem(list, id, null);
    try {
      localStorage.setItem(seenKey(list.id), JSON.stringify(merge.seen));
    } catch {
      // Storage full: the next pass compares again.
    }
  })().finally(() => running.delete(list.id));
  running.set(list.id, work);
  return work;
}

function mergeReadings(theirs: Thing, mine: Thing | undefined): Thing['readings'] {
  if (!mine?.readings?.length || (theirs.readings?.length ?? 0) < READINGS_SHARED) return theirs.readings;
  const oldest = theirs.readings?.[0]?.date ?? '';
  return [...mine.readings.filter((reading) => reading.date < oldest), ...(theirs.readings ?? [])];
}

/** While the app is open: the household's things are brought into step when something here changed, and pulled every 20 seconds in view. */
export function useThingSharing(): void {
  useEffect(() => {
    if (!sharingAvailable) return;
    let last = '';
    let pulled = 0;
    let stopped = false;
    const pass = async () => {
      if (document.visibilityState !== 'visible') return;
      const list = householdList();
      if (!list) return;
      const due = Date.now() - pulled > 20_000;
      const now = fingerprint([...localRecords().values()]);
      if (stopped || (!due && now === last)) return;
      last = now;
      if (due) pulled = Date.now();
      await syncHousehold(list).catch(() => undefined);
    };
    void pass();
    const timer = window.setInterval(() => void pass(), 4_000);
    const onView = () => void pass();
    document.addEventListener('visibilitychange', onView);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onView);
    };
  }, []);
}
