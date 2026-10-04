import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { syncStatus, type SyncStatus } from '../../app/sync/syncController';
import type { Bill } from '../core/bills';
import { listBills, loadSettings, storeVersion, subscribe, type Settings } from '../data/store';

export function useStoreVersion(): number {
  return useSyncExternalStore(subscribe, storeVersion);
}

export function useSettings(): Settings {
  const version = useStoreVersion();
  return useMemo(() => loadSettings(), [version]);
}

export function useBills(): Bill[] | undefined {
  const version = useStoreVersion();
  const [bills, setBills] = useState<Bill[]>();
  useEffect(() => {
    let live = true;
    void listBills().then((all) => live && setBills(all.sort((a, b) => a.name.localeCompare(b.name))));
    return () => {
      live = false;
    };
  }, [version]);
  return bills;
}

export function useToday(): string {
  const [today, setToday] = useState(() => {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  });
  useEffect(() => {
    const check = () => {
      const now = new Date();
      setToday([now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'));
    };
    const timer = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}

export function useAccount(): SyncStatus {
  return useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
