import { useEffect, useState, useSyncExternalStore } from 'react';
import type { LeaveRequest, PtoAccount, PtoLedgerTransaction, WorkProfile } from '../core/pto';
import type { Booking, ItineraryItem, PlaceIdea, Trip } from '../core/trips';
import { listBookings, listItineraryItems, listLeaveRequests, listPlaces, listPtoAccounts, listPtoLedger, listTrips, listWorkProfiles, storeVersion, subscribe } from '../data/store';

function useList<T>(loader: () => Promise<T[]>): T[] {
  useSyncExternalStore(subscribe, storeVersion);
  const [records, setRecords] = useState<T[]>([]);
  useEffect(() => {
    let live = true;
    void loader().then((next) => live && setRecords(next));
    return () => {
      live = false;
    };
  }, [loader]);
  return records;
}

export const useTrips = () => useList<Trip>(listTrips);
export const usePlaces = () => useList<PlaceIdea>(listPlaces);
export const useWorkProfiles = () => useList<WorkProfile>(listWorkProfiles);
export const usePtoAccounts = () => useList<PtoAccount>(listPtoAccounts);
export const usePtoLedger = () => useList<PtoLedgerTransaction>(listPtoLedger);
export const useLeaveRequests = () => useList<LeaveRequest>(listLeaveRequests);
export const useItineraryItems = () => useList<ItineraryItem>(listItineraryItems);
export const useBookings = () => useList<Booking>(listBookings);
