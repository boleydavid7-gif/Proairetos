import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { toLocalDate } from '../../core/scheduling/dates';
import type { GroceryItem } from '../core/groceries';
import type { Recipe } from '../core/recipes';
import { listGroceries, listRecipes, loadSettings, storeVersion, subscribe, type Settings } from '../data/store';

const useVersion = () => useSyncExternalStore(subscribe, storeVersion);

export function useSettings(): Settings {
  const v = useVersion();
  return useMemo(() => loadSettings(), [v]);
}

export function useRecipes(): Recipe[] | undefined {
  const v = useVersion();
  const [recipes, setRecipes] = useState<Recipe[]>();
  useEffect(() => {
    let live = true;
    void listRecipes().then((all) => live && setRecipes(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
    return () => {
      live = false;
    };
  }, [v]);
  return recipes;
}

export function useGroceries(): GroceryItem[] | undefined {
  const v = useVersion();
  const [items, setItems] = useState<GroceryItem[]>();
  useEffect(() => {
    let live = true;
    void listGroceries().then((all) => live && setItems(all));
    return () => {
      live = false;
    };
  }, [v]);
  return items;
}

export function useToday(): string {
  const [today, setToday] = useState(() => toLocalDate(new Date()));
  useEffect(() => {
    const check = () => setToday(toLocalDate(new Date()));
    const timer = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
