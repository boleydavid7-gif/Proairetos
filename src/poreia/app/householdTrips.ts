import { useEffect } from 'react';
import { createSharedLists, sharingAvailable, type SharedListRef } from '../../app/family/sharedLists';
import { fingerprint, mergeRecords } from '../../app/family/recordMerge';
import { householdLists } from '../../app/household/household';
import { sharedId, type RecordKind, type SharedRecord, type TripRecord } from '../core/tripSync';
import { bookings, journal, packing, plans, spends, spots, trips } from './state';

/*
 * Trips shared with the household (Settings > Household > Trips). The household's list for this app holds the records
 * of every trip that is not kept private, one sealed item each (the trip, its bookings, plans, packing, spending, saved
 * places and journal lines); each phone keeps its own records and brings them into step with the shared copy
 * (`mergeRecords`). Documents, time off, a person's own goals and savings (`poreia:links`) never go. A trip marked
 * private is left out of the comparison on both sides, so keeping one private takes nothing off the household's copy.
 */
export const poreiaLists = createSharedLists<SharedRecord>({
  listsKey: 'poreia:household',
  cachePrefix: 'poreiaHousehold',
  label: 'poreia-household',
  defaultName: 'Trips',
});

export { sharingAvailable };

type Store = { list: () => (TripRecord & { tripId?: string })[]; put: (record: never) => void; remove: (id: string) => void };
const STORES: Record<Exclude<RecordKind, 'trip'>, Store> = { booking: bookings, plan: plans, pack: packing, spend: spends, spot: spots, journal };
const storeOf = (kind: RecordKind): Store => (kind === 'trip' ? (trips as unknown as Store) : STORES[kind]);

const seenKey = (listId: string) => `poreiaHousehold.seen.${listId}`;
const readSeen = (listId: string): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(seenKey(listId)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
};

/** The household's trips list on this phone, if it has one. */
export function householdList(): SharedListRef | undefined {
  const ids = householdLists('poreia')?.ids ?? [];
  return poreiaLists.sharedLists().find((list) => ids.includes(list.id));
}

/** A trip taken to the household: not private, and not one of its own shared lists. */
export const sharesWithHousehold = (trip: { private?: boolean; sharedList?: string }) => !trip.private && !trip.sharedList;

/** Every record of the given trips on this phone, as shared items. */
function recordsOf(tripIds: ReadonlySet<string>): Map<string, SharedRecord> {
  const out = new Map<string, SharedRecord>();
  for (const trip of trips.list()) if (tripIds.has(trip.id)) out.set(sharedId('trip', trip.id), { id: sharedId('trip', trip.id), kind: 'trip', record: trip });
  for (const [kind, store] of Object.entries(STORES) as [Exclude<RecordKind, 'trip'>, Store][]) {
    for (const record of store.list()) if (record.tripId && tripIds.has(record.tripId)) out.set(sharedId(kind, record.id), { id: sharedId(kind, record.id), kind, record });
  }
  return out;
}

const tripOf = (item: SharedRecord): string | undefined => (item.kind === 'trip' ? item.record.id : (item.record as TripRecord & { tripId?: string }).tripId);

const running = new Map<string, Promise<void>>();

/** Brings the household's shared trips and this phone's records into step, in both directions. */
export function syncHouseholdTrips(list: SharedListRef): Promise<void> {
  const already = running.get(list.id);
  if (already) return already;
  const work = (async () => {
    await poreiaLists.refreshList(list);
    const all = trips.list();
    const taken = new Set(all.filter(sharesWithHousehold).map((trip) => trip.id));
    const kept = new Set(all.filter((trip) => !sharesWithHousehold(trip)).map((trip) => trip.id));
    const local = recordsOf(taken);
    const sharedItems = poreiaLists.sharedItems(list);
    // Records of a trip kept private here are left out on both sides, and forgotten, so nothing is compared or removed.
    const left = new Set([...recordsOf(kept).keys(), ...sharedItems.filter((item) => kept.has(tripOf(item) ?? '')).map((item) => item.id)]);
    const shared = new Map(sharedItems.filter((item) => !left.has(item.id)).map((item) => [item.id, item]));
    const seen = Object.fromEntries(Object.entries(readSeen(list.id)).filter(([key]) => !left.has(key)));
    const merge = mergeRecords(local, shared, seen);
    for (const item of merge.toLocal) storeOf(item.kind).put(item.record as never);
    for (const item of merge.removeLocal) storeOf(item.kind).remove(item.record.id);
    for (const item of merge.toShared) poreiaLists.changeItem(list, item.id, item);
    for (const id of merge.removeShared) poreiaLists.changeItem(list, id, null);
    try {
      localStorage.setItem(seenKey(list.id), JSON.stringify(merge.seen));
    } catch {
      // Storage full: the next pass compares again.
    }
  })().finally(() => running.delete(list.id));
  running.set(list.id, work);
  return work;
}

/** While the app is open: the household's trips are brought into step when something here changed, and pulled every 20 seconds in view. */
export function useHouseholdTrips(): void {
  useEffect(() => {
    if (!sharingAvailable) return;
    let last = '';
    let pulled = 0;
    const pass = () => {
      if (document.visibilityState !== 'visible') return;
      const list = householdList();
      if (!list) return;
      const due = Date.now() - pulled > 20_000;
      const now = fingerprint([...recordsOf(new Set(trips.list().filter(sharesWithHousehold).map((trip) => trip.id))).values()]);
      if (!due && now === last) return;
      last = now;
      if (due) pulled = Date.now();
      void syncHouseholdTrips(list).catch(() => undefined);
    };
    pass();
    const timer = window.setInterval(pass, 4_000);
    document.addEventListener('visibilitychange', pass);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pass);
    };
  }, []);
}
