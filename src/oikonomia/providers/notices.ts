import { addDays } from '../../core/scheduling/dates';
import { noticeLine, type Provider } from '../../core/providers';
import type { Bill } from '../core/bills';
import { billNotice, billReminders } from '../core/reminders';

/**
 * A bill's reminder on the morning its own lead asks for, with the bill's name and when it is due ("Due Monday, Oct 5", "paid
 * automatically"). Never an amount, an account, a note or a category. A date already paid sends none.
 */
export const oikonomiaNotices: Provider<'notices'> = {
  app: 'oikonomia',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['oikonomiaBills'],
  read: async (ctx) => {
    const bills = await ctx.records<Bill>('oikonomiaBills');
    return billReminders(bills, ctx.today, addDays(ctx.today, 14)).map((reminder) => noticeLine('oikonomia', billNotice(reminder)));
  },
};
