import type { Notice } from '../../core/notify/notices';
import { addDays, atTime } from '../../core/scheduling/dates';
import { growing, nextCheck, nextFeed, type Hemisphere, type Plant, type Rain } from './plants';

export type PlantNoticeChoices = { on: boolean; at: string; feed: boolean; onlyMine: boolean };

export const defaultPlantNotices: PlantNoticeChoices = { on: true, at: '09:00', feed: true, onlyMine: false };

/** One notice on each day plants come round to be checked (and fed, if chosen), naming them. A day already come is not said again. */
export function plantNotices(plants: readonly Plant[], choices: PlantNoticeChoices, me: string | undefined, today: string, horizon: number, now: Date, hemisphere: Hemisphere = 'north', rain: Rain = {}): Notice[] {
  if (!choices.on) return [];
  const byDay = new Map<string, { check: string[]; feed: string[] }>();
  const add = (day: string, what: 'check' | 'feed', name: string) => {
    const entry = byDay.get(day) ?? { check: [], feed: [] };
    entry[what].push(name);
    byDay.set(day, entry);
  };
  for (const plant of plants) {
    if (choices.onlyMine && me && plant.who && plant.who !== me) continue;
    const day = nextCheck(plant, today, hemisphere, rain);
    if (day >= today && day <= addDays(today, horizon)) add(day, 'check', plant.name);
    if (choices.feed) {
      const fed = nextFeed(plant, today, hemisphere);
      if (fed && fed >= today && fed <= addDays(today, horizon) && growing(fed, hemisphere)) add(fed, 'feed', plant.name);
    }
  }
  const notices: Notice[] = [];
  for (const [day, { check, feed }] of byDay) {
    const at = atTime(day, choices.at);
    if (at < now) continue;
    const sorted = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b));
    const lines = [check.length ? `Check the soil: ${sorted(check).join(', ')}` : '', feed.length ? `Feed: ${sorted(feed).join(', ')}` : ''].filter(Boolean);
    const one = check.length + feed.length === 1;
    notices.push({
      key: `phyton:${day}:${[...sorted(check), '/', ...sorted(feed)].join('|').slice(0, 80)}`,
      kind: 'plant',
      at,
      title: one ? (check[0] ?? feed[0]) : check.length ? `${check.length} ${check.length === 1 ? 'plant' : 'plants'} to check` : `${feed.length} plants to feed`,
      body: one ? (check.length ? 'Check the soil.' : 'Feed today.') : lines.join('. ') + '.',
      open: 'phyton:today',
    });
  }
  return notices;
}
