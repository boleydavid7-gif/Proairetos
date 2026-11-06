import { billsSoon } from '../../app/family/glance';
import type { Provider } from '../../core/providers';
import { parseLocalDate } from '../../core/scheduling/dates';
import type { Bill } from '../core/bills';

const shortDay = (date: string) => parseLocalDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/*
 * Bills with a date in the next few days and no payment recorded: their names and the first date. Never an amount, an
 * account, a balance or a note (manifest, oikonomia.home). It opens the bill when there is one, else Oikonomia.
 */
export const oikonomiaHome: Provider<'home'> = {
  app: 'oikonomia',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['oikonomiaBills'],
  async read(ctx) {
    const soon = billsSoon(await ctx.records<Bill>('oikonomiaBills'), ctx.today);
    if (soon.length === 0) return [];
    const names = soon.slice(0, 2).map((bill) => bill.name).join(', ');
    return [
      {
        ref: { app: 'oikonomia', kind: 'bills', id: 'soon' },
        group: 'attention',
        title: `${names}${soon.length > 2 ? ` +${soon.length - 2}` : ''}`,
        detail: `Due ${shortDay(soon[0].date)}`,
        open: new Set(soon.map((bill) => bill.id)).size === 1 ? `/oikonomia/?open=bill:${encodeURIComponent(soon[0].id)}` : '/oikonomia/',
        icon: 'list',
        swipe: { id: `bills:${soon.map((bill) => `${bill.id}@${bill.date}`).join(',')}`, label: names },
        notForMe: 'bills',
      },
    ];
  },
};
