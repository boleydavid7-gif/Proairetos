import { useSyncExternalStore } from 'react';
import { subscribePreferences, todayHiddenSnapshot, type TodayPart } from '../../data/storage/preferences';
import { addedSnapshot, subscribeAdded, type AddOn } from '../family/added';

/** The app each family part comes from: a part shows only while its app is added in the Store. */
export const PART_APP: Partial<Record<TodayPart, AddOn>> = {
  askesis: 'askesis',
  soma: 'soma',
  bills: 'oikonomia',
  'bill-dates': 'oikonomia',
  water: 'hydros',
  praxis: 'praxis',
  highlight: 'theoria',
  diaita: 'diaita',
  birthdays: 'philia',
  'birthday-dates': 'philia',
  chores: 'ergon',
  medicines: 'therapeia',
  training: 'dynamis',
  upkeep: 'ktema',
  plants: 'phyton',
  trips: 'poreia',
  mneme: 'mneme',
  'study-dates': 'melete',
};

/** Each app's own parts have no switch of their own (Nov 5): an app shows on Today through "Apps on Today" in What's
 *  included (Daily practices, Worth your attention), so an older choice stored for one of these is no longer read. */
const APP_PARTS: ReadonlySet<TodayPart> = new Set<TodayPart>(['askesis', 'soma', 'praxis', 'birthdays', 'birthday-dates', 'chores', 'medicines', 'upkeep', 'plants', 'trips', 'bills', 'bill-dates', 'study-dates']);

/** Which parts of Today the person keeps. Read live, so a change or an undo shows at once. */
export function useTodayParts(): (part: TodayPart) => boolean {
  const snapshot = useSyncExternalStore(subscribePreferences, todayHiddenSnapshot);
  const added = useSyncExternalStore(subscribeAdded, addedSnapshot);
  const hidden = new Set(snapshot ? snapshot.split(',') : []);
  const apps = new Set(added ? added.split(',') : []);
  return (part) => {
    const app = PART_APP[part];
    if (app && !apps.has(app)) return false;
    return APP_PARTS.has(part) || !hidden.has(part);
  };
}
