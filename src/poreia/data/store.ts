import { onRemoteChanges, syncSoon } from '../../app/sync/syncController';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';
import { notify as notifyPoreiaChanges } from './changes';
import type { LeaveRequest, PtoAccount, PtoLedgerTransaction, VacationPlan, WorkProfile } from '../core/pto';
import type { Booking, ItineraryItem, PlaceIdea, Trip } from '../core/trips';
import type { TripSavingsPlan } from '../core/savings';

const listeners = new Set<() => void>();
let version = 0;
let database: Promise<IDBDatabase | undefined> | undefined;

function db(): Promise<IDBDatabase | undefined> {
  database ??= openDatabase().catch(() => undefined);
  return database;
}

function notify(): void {
  version += 1;
  notifyPoreiaChanges();
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function storeVersion(): number {
  return version;
}

async function list<T>(store: string): Promise<T[]> {
  const handle = await db();
  if (!handle) return [];
  return new Promise<T[]>((resolve, reject) => {
    const transaction = handle.transaction(store, 'readonly');
    const request = transaction.objectStore(store).getAll() as IDBRequest<T[]>;
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put<T extends { id: string }>(store: string, value: T): Promise<void> {
  const handle = await db();
  if (handle) {
    await new Promise<void>((resolve, reject) => {
      const transaction = handle.transaction(store, 'readwrite');
      transaction.objectStore(store).put(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  notify();
  syncSoon();
}

export const listTrips = () => list<Trip>(stores.poreiaTrips);
export const putTrip = (trip: Trip) => put(stores.poreiaTrips, trip);
export const listPlaces = () => list<PlaceIdea>(stores.poreiaPlaces);
export const putPlace = (place: PlaceIdea) => put(stores.poreiaPlaces, place);
export async function removePlace(id: string): Promise<void> {
  const handle = await db();
  if (handle) {
    await new Promise<void>((resolve, reject) => {
      const transaction = handle.transaction(stores.poreiaPlaces, 'readwrite');
      transaction.objectStore(stores.poreiaPlaces).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  notify();
  syncSoon();
}
export const listWorkProfiles = () => list<WorkProfile>(stores.poreiaWorkProfiles);
export const putWorkProfile = (profile: WorkProfile) => put(stores.poreiaWorkProfiles, profile);
export const listPtoAccounts = () => list<PtoAccount>(stores.poreiaPtoAccounts);
export const putPtoAccount = (account: PtoAccount) => put(stores.poreiaPtoAccounts, account);
export const listPtoLedger = () => list<PtoLedgerTransaction>(stores.poreiaPtoLedger);
export const putPtoLedger = (entry: PtoLedgerTransaction) => put(stores.poreiaPtoLedger, entry);
export const listLeaveRequests = () => list<LeaveRequest>(stores.poreiaLeaveRequests);
export const putLeaveRequest = (request: LeaveRequest) => put(stores.poreiaLeaveRequests, request);
export const listVacations = () => list<VacationPlan>(stores.poreiaVacations);
export const putVacation = (vacation: VacationPlan) => put(stores.poreiaVacations, vacation);
export const listItineraryItems = () => list<ItineraryItem>(stores.poreiaItineraryItems);
export const putItineraryItem = (item: ItineraryItem) => put(stores.poreiaItineraryItems, item);
export const listBookings = () => list<Booking>(stores.poreiaBookings);
export const putBooking = (booking: Booking) => put(stores.poreiaBookings, booking);
export const listSavingsPlans = () => list<TripSavingsPlan>(stores.poreiaSavingsPlans);
export const putSavingsPlan = (plan: TripSavingsPlan) => put(stores.poreiaSavingsPlans, plan);

export async function startStore(): Promise<void> {
  await db();
  onRemoteChanges(notify);
}
