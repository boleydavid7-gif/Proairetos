import { useEffect, useState } from 'react';
import { copyFor, dailyCopiesOn, listCopies, setDailyCopies, type DailyCopyInfo } from '../../data/backup/daily';
import { backupService } from '../services';
import { makeDailyCopy } from './dailyCopy';

/** The daily copies on this phone, the switch for them, and restoring one. */
export function useDailyCopies() {
  const [on, setOn] = useState(() => dailyCopiesOn());
  const [copies, setCopies] = useState<DailyCopyInfo[]>([]);

  useEffect(() => {
    let live = true;
    void listCopies().then((list) => live && setCopies(list));
    return () => {
      live = false;
    };
  }, [on]);

  const turn = async (next: boolean) => {
    try {
      setDailyCopies(next);
    } catch {
      // Kept for this visit only.
    }
    setOn(next);
    if (next) {
      await makeDailyCopy();
      setCopies(await listCopies());
    }
  };

  /** Replaces everything here with that day's copy, then starts the app again. */
  const restore = async (day: string) => {
    const text = await copyFor(day);
    if (!text) throw new Error('That copy is no longer here.');
    const { data } = await backupService.readFile(text);
    await backupService.replaceAll(data);
    window.location.reload();
  };

  return { on, turn, copies, restore };
}

export function dayName(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}
