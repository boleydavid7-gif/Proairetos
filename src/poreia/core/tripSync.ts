/*
 * A shared trip kept in step with this phone's own records. Each record of the trip (the trip, its bookings, plans,
 * packing, spending and saved places) is one sealed item in the trip's shared list. Against what was last seen in
 * step, a side that changed wins; when both changed, the later edit wins (the shared copy on a tie); a record gone
 * from one side since then is taken from the other too.
 */

export type RecordKind = 'trip' | 'booking' | 'plan' | 'pack' | 'spend' | 'spot' | 'journal';
export type TripRecord = { id: string; updatedAt?: string; createdAt?: string };
export type SharedRecord = { id: string; kind: RecordKind; record: TripRecord };

export const sharedId = (kind: RecordKind, id: string) => `${kind}:${id}`;

/** A short fingerprint of a record's contents, kept per item to know which side changed. */
export function fingerprint(record: unknown): string {
  const text = JSON.stringify(record);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  return `${(hash >>> 0).toString(36)}.${text.length}`;
}

export type TripMerge = {
  toLocal: SharedRecord[];
  removeLocal: SharedRecord[];
  toShared: SharedRecord[];
  removeShared: string[];
  seen: Record<string, string>;
};

const edited = (item: SharedRecord) => item.record.updatedAt ?? item.record.createdAt ?? '';

export function mergeTrip(local: ReadonlyMap<string, SharedRecord>, shared: ReadonlyMap<string, SharedRecord>, seen: Readonly<Record<string, string>>): TripMerge {
  const out: TripMerge = { toLocal: [], removeLocal: [], toShared: [], removeShared: [], seen: {} };
  for (const key of new Set([...local.keys(), ...shared.keys()])) {
    const mine = local.get(key);
    const theirs = shared.get(key);
    const before = seen[key];
    if (mine && theirs) {
      const a = fingerprint(mine.record);
      const b = fingerprint(theirs.record);
      if (a === b) out.seen[key] = a;
      else if (a === before) {
        out.toLocal.push(theirs);
        out.seen[key] = b;
      } else if (b === before) {
        out.toShared.push(mine);
        out.seen[key] = a;
      } else if (edited(mine) > edited(theirs)) {
        out.toShared.push(mine);
        out.seen[key] = a;
      } else {
        out.toLocal.push(theirs);
        out.seen[key] = b;
      }
    } else if (mine) {
      // Taken off the shared trip by someone else since the last time in step; else new here.
      if (before) out.removeLocal.push(mine);
      else {
        out.toShared.push(mine);
        out.seen[key] = fingerprint(mine.record);
      }
    } else if (theirs) {
      if (before) out.removeShared.push(key);
      else {
        out.toLocal.push(theirs);
        out.seen[key] = fingerprint(theirs.record);
      }
    }
  }
  return out;
}
