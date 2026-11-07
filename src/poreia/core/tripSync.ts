/*
 * A shared trip kept in step with this phone's own records. Each record of the trip (the trip, its bookings, plans,
 * packing, spending and saved places) is one sealed item in the trip's shared list. Against what was last seen in
 * step, a side that changed wins; when both changed, the later edit wins (the shared copy on a tie); a record gone
 * from one side since then is taken from the other too (the merge itself is `app/family/recordMerge.ts`).
 */

import { fingerprint, mergeRecords, type RecordMerge } from '../../app/family/recordMerge';

export type RecordKind = 'trip' | 'booking' | 'plan' | 'pack' | 'spend' | 'spot' | 'journal';
export type TripRecord = { id: string; updatedAt?: string; createdAt?: string };
export type SharedRecord = { id: string; kind: RecordKind; record: TripRecord };

export const sharedId = (kind: RecordKind, id: string) => `${kind}:${id}`;

export { fingerprint };

export type TripMerge = RecordMerge<SharedRecord>;

export const mergeTrip = (local: ReadonlyMap<string, SharedRecord>, shared: ReadonlyMap<string, SharedRecord>, seen: Readonly<Record<string, string>>): TripMerge => mergeRecords(local, shared, seen);
