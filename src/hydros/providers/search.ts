import { windowStart, type Provider, type SearchProjection } from '../../core/providers';
import { kindLabel, localDate, volumeLabel, type Drink, type HydrosUnit } from '../core/drinks';

/*
 * What universal search may know about Hydros, once the person turns it on in What's included: the names of the drinks
 * logged in the last 30 days, and one line for each of those days (the day's total and which drinks). Not individual
 * drinks, times, caffeine, sugar, electrolytes or a daily amount. The manifest (`hydros.search`) holds the same limits
 * and the host enforces the window again.
 */
export const HYDROS_WINDOW_DAYS = 30;

const unitOf = (raw: string | null): HydrosUnit => {
  try {
    const unit = (JSON.parse(raw ?? '{}') as { unit?: string }).unit;
    return unit === 'ml' || unit === 'L' || unit === 'oz' ? unit : 'oz';
  } catch {
    return 'oz';
  }
};

const day = (drink: Drink) => localDate(new Date(drink.loggedAt));
const nameOf = (drink: Drink) => drink.label?.trim() || kindLabel(drink.kind);

export const hydrosSearch: Provider<'search'> = {
  app: 'hydros',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['hydrosDrinks', 'setting:hydros:settings'],
  async read(ctx) {
    const start = windowStart(ctx.today, HYDROS_WINDOW_DAYS);
    const unit = unitOf(ctx.setting('hydros:settings'));
    const inWindow = (await ctx.records<Drink>('hydrosDrinks')).filter((drink) => day(drink) >= start && day(drink) <= ctx.today);
    const names = new Map<string, { name: string; latest: string; latestDay: string }>();
    const days = new Map<string, { ounces: number; names: Set<string> }>();
    for (const drink of inWindow) {
      const name = nameOf(drink);
      const key = name.toLowerCase();
      const seen = names.get(key);
      if (!seen || drink.loggedAt > seen.latest) names.set(key, { name: seen?.name ?? name, latest: drink.loggedAt, latestDay: day(drink) });
      const entry = days.get(day(drink)) ?? { ounces: 0, names: new Set<string>() };
      entry.ounces += drink.amountOz;
      entry.names.add(name);
      days.set(day(drink), entry);
    }
    const out: SearchProjection[] = [];
    for (const [key, { name, latestDay }] of names) {
      out.push({
        ref: { app: 'hydros', kind: 'drink-name', id: key },
        title: name,
        titleField: 'named drink types',
        fields: [],
        // The day only: the time of a drink is not part of what search holds.
        at: latestDay,
        label: 'Drink in Hydros',
        open: '/hydros/?open=flow',
      });
    }
    for (const [date, { ounces, names: drinks }] of days) {
      out.push({
        ref: { app: 'hydros', kind: 'day', id: date },
        title: new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`)),
        titleField: 'day summaries',
        fields: [{ name: 'day summaries', text: `${volumeLabel(ounces, unit)} · ${[...drinks].join(', ')}` }],
        at: date,
        label: 'Day in Hydros',
        open: '/hydros/?open=flow',
      });
    }
    return out;
  },
  subscribe(listener) {
    let off = () => {};
    void import('../data/store').then((store) => {
      off = store.subscribe(listener);
    });
    return () => off();
  },
};
