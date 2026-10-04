import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { listDrinks, loadSettings, saveSettings, storeVersion, subscribe, type HydrosSettings } from '../data/store';
import type { Drink } from '../core/drinks';
import { trainingToday, type TrainingToday } from '../data/training';

const snapshot = () => storeVersion();
export function useStoreVersion(): number { return useSyncExternalStore(subscribe, snapshot); }
export function useSettings(): HydrosSettings { const version = useStoreVersion(); return useMemo(() => loadSettings(), [version]); }
export function useDrinks(): Drink[] | undefined {
  const version = useStoreVersion();
  const [drinks, setDrinks] = useState<Drink[]>();
  useEffect(() => { let live = true; void listDrinks().then((value) => live && setDrinks(value.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)))); return () => { live = false; }; }, [version]);
  return drinks;
}
export function useTraining(): TrainingToday | undefined {
  const version = useStoreVersion();
  const [training, setTraining] = useState<TrainingToday>();
  useEffect(() => { let live = true; void trainingToday().then((value) => live && setTraining(value)); return () => { live = false; }; }, [version]);
  return training;
}
export function updateSettings(change: Partial<HydrosSettings>): void { saveSettings({ ...loadSettings(), ...change }); }
