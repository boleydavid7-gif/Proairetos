import { useEffect } from 'react';
import { createSharedLists, sharingAvailable, type SharedListRef } from '../../app/family/sharedLists';
import { fingerprint, mergeTrip, sharedId, type RecordKind, type SharedRecord, type TripRecord } from '../core/tripSync';
import type { Trip } from '../core/model';
import { bookings, packing, plans, spends, spots, trips } from './state';

/*
 * Travel together: a trip shared with the people going, sealed on the device with the trip's own key (the family's
 * shared lists, migration 20261018000000_shared_lists.sql). Each phone keeps its own records as always; while the trip
 * is shared, they are kept in step with the shared copy (`mergeTrip`) every few seconds the app is open. The invite link
 * carries the key after `#`, so the server never has it. Leaving keeps a copy on this phone.
 */

export const sharedTrips = createSharedLists<SharedRecord>({
  listsKey: 'poreia:sharedTrips',
  cachePrefix: 'poreiaShared',
  label: 'poreia-list',
  defaultName: 'Trip',
});

export { sharingAvailable };

/** Any of the trip's stores, read and written as plain records. */
type Store = { list: () => (TripRecord & { tripId?: string })[]; get: (id: string) => TripRecord | undefined; put: (record: never) => void; remove: (id: string) => void };

const STORES: Record<Exclude<RecordKind, 'trip'>, Store> = { booking: bookings, plan: plans, pack: packing, spend: spends, spot: spots };

const seenKey = (listId: string) => `poreiaShared.seen.${listId}`;
const readSeen = (listId: string): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(seenKey(listId)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
};

/** Every record of a trip on this phone, as shared items. */
function localRecords(tripId: string): Map<string, SharedRecord> {
  const out = new Map<string, SharedRecord>();
  const trip = trips.get(tripId);
  if (trip) out.set(sharedId('trip', trip.id), { id: sharedId('trip', trip.id), kind: 'trip', record: trip });
  for (const [kind, store] of Object.entries(STORES) as [Exclude<RecordKind, 'trip'>, Store][]) {
    for (const record of store.list()) if (record.tripId === tripId) out.set(sharedId(kind, record.id), { id: sharedId(kind, record.id), kind, record });
  }
  return out;
}

const storeOf = (kind: RecordKind): Store => (kind === 'trip' ? trips : STORES[kind]);

/** The trip a shared list holds: the one marked with it here, else the trip record in it. */
export function tripOfList(list: SharedListRef): string | undefined {
  return trips.list().find((trip) => trip.sharedList === list.id)?.id ?? sharedTrips.sharedItems(list).find((item) => item.kind === 'trip')?.record.id;
}

export const listOfTrip = (trip: Trip): SharedListRef | undefined => (trip.sharedList ? sharedTrips.sharedLists().find((list) => list.id === trip.sharedList) : undefined);

const running = new Map<string, Promise<void>>();

/** Brings the shared copy and this phone's records into step, in both directions. */
export function syncList(list: SharedListRef): Promise<void> {
  const already = running.get(list.id);
  if (already) return already;
  const work = (async () => {
    await sharedTrips.refreshList(list);
    const tripId = tripOfList(list);
    if (!tripId) return;
    const shared = new Map(sharedTrips.sharedItems(list).map((item) => [item.id, item]));
    const merge = mergeTrip(localRecords(tripId), shared, readSeen(list.id));
    for (const item of merge.toLocal) storeOf(item.kind).put((item.kind === 'trip' ? { ...item.record, sharedList: list.id } : item.record) as never);
    for (const item of merge.removeLocal) storeOf(item.kind).remove(item.record.id);
    for (const item of merge.toShared) sharedTrips.changeItem(list, item.id, item);
    for (const id of merge.removeShared) sharedTrips.changeItem(list, id, null);
    try {
      localStorage.setItem(seenKey(list.id), JSON.stringify(merge.seen));
    } catch {
      // Storage full: the next pass compares again.
    }
  })().finally(() => running.delete(list.id));
  running.set(list.id, work);
  return work;
}

/** Shares a trip: a new list, the trip marked with it, and everything sent. */
export async function shareTrip(trip: Trip): Promise<SharedListRef> {
  const list = await sharedTrips.createList(trip.name);
  trips.put({ ...trip, sharedList: list.id, updatedAt: new Date().toISOString() });
  await syncList(list);
  return list;
}

/** Joins a trip from its invite; its records arrive on this phone. Gives back the trip's id. */
export async function joinTrip(invite: { id: string; key: string; name: string }): Promise<string | undefined> {
  const list = await sharedTrips.joinList(invite);
  await syncList(list);
  return tripOfList(list);
}

/** Stops keeping the trip in step on this phone; the records stay here as they are. */
export async function leaveTrip(trip: Trip): Promise<void> {
  const list = listOfTrip(trip);
  if (list) await sharedTrips.leaveList(list);
  try {
    localStorage.removeItem(seenKey(trip.sharedList ?? ''));
  } catch {
    // Nothing to tidy.
  }
  trips.put({ ...trip, sharedList: undefined, updatedAt: new Date().toISOString() });
}

/** The invite link: `/poreia/?open=join:ID#k=KEY&n=NAME`. The key after `#` never reaches a server. */
export function inviteLink(origin: string, list: SharedListRef): string {
  return `${origin}/poreia/?open=join:${list.id}#k=${list.key}&n=${encodeURIComponent(list.name)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readInvite(search: string, hash: string): { id: string; key: string; name: string } | undefined {
  const open = new URLSearchParams(search).get('open') ?? '';
  if (!open.startsWith('join:')) return undefined;
  const id = open.slice(5);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const key = fragment.get('k') ?? '';
  if (!UUID.test(id) || !/^[A-Za-z0-9_-]{40,50}$/.test(key)) return undefined;
  return { id, key, name: (fragment.get('n') ?? '').slice(0, 60) || 'Trip' };
}

const INVITE = 'poreiaShared.invite';

export function keepInvite(invite: { id: string; key: string; name: string }): void {
  try {
    sessionStorage.setItem(INVITE, JSON.stringify(invite));
  } catch {
    // Private mode: the invite card shows only this time.
  }
}

export function pendingInvite(): { id: string; key: string; name: string } | undefined {
  try {
    return JSON.parse(sessionStorage.getItem(INVITE) ?? 'null') ?? undefined;
  } catch {
    return undefined;
  }
}

export function setInviteAside(): void {
  try {
    sessionStorage.removeItem(INVITE);
  } catch {
    // Nothing kept.
  }
}

/**
 * While the app is open: each shared trip is brought into step every few seconds when something here changed, and
 * pulled every 20 seconds the page is in view.
 */
export function useTripSharing(): void {
  useEffect(() => {
    if (!sharingAvailable) return;
    const last = new Map<string, string>();
    let pulled = 0;
    const pass = () => {
      if (document.visibilityState !== 'visible') return;
      const due = Date.now() - pulled > 20_000;
      for (const list of sharedTrips.sharedLists()) {
        const tripId = tripOfList(list);
        const now = tripId ? fingerprint([...localRecords(tripId).values()]) : '';
        if (!due && last.get(list.id) === now) continue;
        last.set(list.id, now);
        void syncList(list).catch(() => undefined);
      }
      if (due) pulled = Date.now();
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
