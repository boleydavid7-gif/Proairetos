import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { syncStatus, type SyncStatus } from '../../app/sync/syncController';
import type { Bill } from '../core/bills';
import type { BudgetPlan } from '../core/budget';
import type { Recipe } from '../../soma/core/recipes';
import { listBills, listBudgets, loadSettings, storeVersion, subscribe, type Settings } from '../data/store';
import { listRecipes } from '../../soma/data/store';
import { onRemoteChanges } from '../../app/sync/syncController';

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

export function useBudget(month: string): BudgetPlan | null {
  const version = useStoreVersion();
  const [budget, setBudget] = useState<BudgetPlan | null>(null);
  useEffect(() => {
    let live = true;
    setBudget(null);
    void listBudgets().then((all) => live && setBudget(all.find((item) => item.month === month) ?? null));
    return () => {
      live = false;
    };
  }, [month, version]);
  return budget;
}

/** Read SOMA's planned meals when the shared family database changes or becomes visible. */
export function useSomaRecipes(): Recipe[] {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void listRecipes().then((next) => live && setRecipes(next));
    load();
    const off = onRemoteChanges(load);
    const onShow = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      live = false;
      off();
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);
  return recipes;
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
