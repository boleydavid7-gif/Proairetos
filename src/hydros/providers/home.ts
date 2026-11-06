import { watchLocal } from '../../app/family/localChanges';
import type { Provider } from '../../core/providers';
import { personalDate } from '../../core/rhythm/personalDay';
import { addDays, atTime } from '../../core/scheduling/dates';
import { loadSettings, subscribe as drinksChanged } from '../data/store';
import { defaultDrinkProfiles, effectiveGoalOz, formatVolume, hydrationOz, type Drink, type HydrosUnit } from '../core/drinks';

/*
 * One line on water: the amount drunk today (and against the daily amount only when the person chose one), with a bar.
 * Amounts only; never individual drinks, times, caffeine, sugar or electrolytes (manifest, hydros.home). A drink counts
 * on the day the person's schedule says it belongs to, so a night shift keeps its water.
 */
export const hydrosHome: Provider<'home'> = {
  app: 'hydros',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['hydrosDrinks', 'setting:hydros:settings', 'schedulePatterns', 'scheduleExceptions'],
  async read(ctx) {
    const settings = loadSettings();
    const blocks = ctx.schedule ? await ctx.schedule(atTime(addDays(ctx.today, -1), '00:00'), atTime(addDays(ctx.today, 2), '00:00')) : [];
    const day = ctx.daySettings?.() ?? { startHour: 0, followShifts: true };
    const drinks = (await ctx.records<Drink>('hydrosDrinks')).filter((drink) => personalDate(new Date(drink.loggedAt), blocks, day) === ctx.today);
    const profiles = settings.drinkProfiles?.length ? settings.drinkProfiles : defaultDrinkProfiles();
    const unit = (settings.unit ?? 'oz') as HydrosUnit;
    const hydration = hydrationOz(drinks, profiles);
    const goal = settings.goalChosen ? effectiveGoalOz(settings) : undefined;
    const detail = goal ? `${formatVolume(hydration, unit)} of ${formatVolume(goal, unit)} ${unit}` : hydration > 0 ? `${formatVolume(hydration, unit)} ${unit} logged` : 'No drinks logged yet';
    return [
      {
        ref: { app: 'hydros', kind: 'practice', id: 'today' },
        group: 'practice',
        detail,
        open: '/hydros/',
        ...(goal ? { progress: { value: Math.max(0, Math.min(1, hydration / goal)), label: `${formatVolume(hydration, unit)} of ${formatVolume(goal, unit)} ${unit}` } } : {}),
      },
    ];
  },
  subscribe(listener) {
    const offs = [drinksChanged(listener), watchLocal('hydros:settings', listener)];
    return () => offs.forEach((off) => off());
  },
};
