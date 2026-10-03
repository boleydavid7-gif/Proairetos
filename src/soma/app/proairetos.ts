import { useEffect, useState } from 'react';
import type { CompassStatement } from '../../core/compass/types';
import { addDays, parseLocalDate } from '../../core/scheduling/dates';
import { scheduleBetween } from '../../askesis/data/proairetosSchedule';
import { energyFor, type Energy } from '../../data/storage/preferences';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';
import { weatherSettings } from '../../app/weather/weather';
import type { Block } from '../core/dayShape';

/**
 * What SOMA reads from Proairetos on this phone (never writes): the
 * person's schedule, the energy word they chose for today, the people who
 * matter to them (Compass), and the place they gave for the weather.
 */
export async function blocksAround(today: string): Promise<Block[]> {
  const occurrences = await scheduleBetween(parseLocalDate(addDays(today, -1)), parseLocalDate(addDays(today, 6)));
  return occurrences.map((each) => ({
    kind: each.kind,
    name: each.label || each.patternName || 'Busy',
    date: each.date,
    start: each.start,
    end: each.end,
  }));
}

export function useBlocks(today: string): Block[] {
  const [blocks, setBlocks] = useState<Block[]>([]);
  useEffect(() => {
    let live = true;
    void blocksAround(today)
      .then((next) => live && setBlocks(next))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [today]);
  return blocks;
}

export function energyToday(today: string): Energy | undefined {
  try {
    return energyFor(today);
  } catch {
    return undefined;
  }
}

/** Names of the people in Compass, for "Cooked for". */
export async function peopleNames(): Promise<string[]> {
  try {
    const db = await openDatabase();
    const all = await new Promise<CompassStatement[]>((resolve) => {
      const request = db.transaction(stores.statements, 'readonly').objectStore(stores.statements).getAll();
      request.onsuccess = () => resolve(request.result as CompassStatement[]);
      request.onerror = () => resolve([]);
    });
    return all.filter((each) => each.type === 'PERSON').map((each) => each.body.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function usePeople(): string[] {
  const [people, setPeople] = useState<string[]>([]);
  useEffect(() => {
    void peopleNames().then(setPeople);
  }, []);
  return people;
}

export function latitude(): number | undefined {
  try {
    return weatherSettings().place?.lat;
  } catch {
    return undefined;
  }
}
