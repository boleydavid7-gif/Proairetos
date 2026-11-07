import type { Notice } from '../../core/notify/notices';
import { addDays, atTime } from '../../core/scheduling/dates';
import { growing, nextCheck, nextFeed, type Hemisphere, type Plant, type Rain } from './plants';
import { degrees, frostTonight, hotDays, isAway, type Away, type Forecast } from './outdoors';

export type PlantNoticeChoices = { on: boolean; at: string; feed: boolean; onlyMine: boolean };

export const defaultPlantNotices: PlantNoticeChoices = { on: true, at: '09:00', feed: true, onlyMine: false };

/** What else shapes the notices: the weather for plants outside, and days away. */
export type NoticeContext = { hemisphere?: Hemisphere; rain?: Rain; forecast?: Forecast; unit?: 'C' | 'F'; away?: Away };

/** Frost warnings go out in the early evening, while there is light to bring pots in. */
export const FROST_AT = '17:00';

/**
 * One notice on each day plants come around to be checked (and fed, if chosen), naming them. A day already come is
 * not said again. Days away say nothing; the day after, one notice names what came around meanwhile. Frost tonight
 * is said at 17:00, naming the plants outside.
 */
export function plantNotices(plants: readonly Plant[], choices: PlantNoticeChoices, me: string | undefined, today: string, horizon: number, now: Date, context: NoticeContext = {}): Notice[] {
  if (!choices.on) return [];
  const { hemisphere = 'north', rain = {}, forecast = {}, unit = 'C', away } = context;
  const hot = hotDays(forecast);
  const mine = plants.filter((plant) => !(choices.onlyMine && me && plant.who && plant.who !== me));
  const byDay = new Map<string, { check: string[]; feed: string[] }>();
  const add = (day: string, what: 'check' | 'feed', name: string) => {
    const entry = byDay.get(day) ?? { check: [], feed: [] };
    entry[what].push(name);
    byDay.set(day, entry);
  };
  const back = away ? addDays(away.to, 1) : undefined;
  for (const plant of mine) {
    let day = nextCheck(plant, today, hemisphere, rain, hot);
    // Came around while away: said once, the day after coming home.
    if (back && day <= away!.to && back >= today && (day >= away!.from || isAway(away, today))) day = back;
    if (day >= today && day <= addDays(today, horizon)) add(day, 'check', plant.name);
    if (choices.feed) {
      const fed = nextFeed(plant, today, hemisphere);
      if (fed && fed >= today && fed <= addDays(today, horizon) && growing(fed, hemisphere) && !isAway(away, fed)) add(fed, 'feed', plant.name);
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
      title: day === back ? 'Back home' : one ? (check[0] ?? feed[0]) : check.length ? `${check.length} ${check.length === 1 ? 'plant' : 'plants'} to check` : `${feed.length} plants to feed`,
      body: one && day !== back ? (check.length ? 'Check the soil.' : 'Feed today.') : lines.join('. ') + '.',
      open: 'phyton:today',
    });
  }
  // Frost tonight and tomorrow night, as far as the forecast goes.
  for (const day of [today, addDays(today, 1)]) {
    const frost = frostTonight(mine, forecast, day);
    const at = atTime(day, FROST_AT);
    if (!frost || at < now || isAway(away, day)) continue;
    const names = frost.plants.map((plant) => plant.name).sort((a, b) => a.localeCompare(b));
    notices.push({ key: `phyton:frost:${day}`, kind: 'plant', at, title: `Frost tonight, ${degrees(frost.min, unit)}`, body: `Outside: ${names.join(', ')}.`, open: 'phyton:today' });
  }
  return notices;
}
