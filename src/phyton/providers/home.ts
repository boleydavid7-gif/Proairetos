import { watchLocal } from '../../app/family/localChanges';
import { homeDayText, sinceText, type Provider } from '../../core/providers';
import { forecastNow, rainNow, watchOutdoors } from '../app/rain';
import { allPlants, homes, myName, putPlant, settings } from '../app/state';
import { hotDays } from '../core/outdoors';
import { nextCheck, water, type Plant } from '../core/plants';

/*
 * Plants that have come round to be checked: the name and since when. Never the note, place or photos (manifest,
 * phyton.home). It reads the forecast Phyton kept on this device (it fetches nothing). A pull marks it watered in Phyton.
 */
export const phytonHome: Provider<'home'> = {
  app: 'phyton',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['local:phyton:plant:', 'shared:phyton', 'setting:phyton:settings', 'device:phytonDevice.rain'],
  read(ctx) {
    const current = settings.load();
    const rain = current.rain ? rainNow() : {};
    const hot = hotDays(current.rain ? forecastNow() : {});
    return allPlants()
      .map((plant) => ({ plant, day: nextCheck(plant, ctx.today, current.hemisphere, rain, hot) }))
      .filter((each) => each.day <= ctx.today)
      .sort((a, b) => a.day.localeCompare(b.day) || a.plant.name.localeCompare(b.plant.name))
      .map(({ plant, day }: { plant: Plant; day: string }) => ({
        ref: { app: 'phyton' as const, kind: 'plant', id: plant.id },
        group: 'attention' as const,
        title: plant.name,
        detail: ['Check the soil', sinceText(homeDayText(day, ctx.today))].filter(Boolean).join(' · '),
        open: `/phyton/?open=${encodeURIComponent(`plant:${plant.id}`)}`,
        swipe: { id: `plant:${plant.id}`, word: 'Watered', marks: true },
      }));
  },
  act(ref, today) {
    const before = allPlants().find((plant) => plant.id === ref.id);
    if (!before) return () => undefined;
    putPlant(water(before, today, myName() || before.who));
    return () => putPlant(before);
  },
  subscribe(listener) {
    const offs = [homes.subscribeShared(listener), watchLocal('phyton:plant:', listener), watchLocal('phyton:settings', listener), watchOutdoors(listener)];
    return () => offs.forEach((off) => off());
  },
};
