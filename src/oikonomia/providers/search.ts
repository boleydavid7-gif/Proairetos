import { formatDate, localDate, standing, type Bill } from '../core/bills';
import type { Provider } from '../../core/providers';

/*
 * What universal search may know about a bill: its name (the payee), the date it is due, and whether it is paid.
 * Never the amount, notes, account, balance, category or payment history. A result opens the bill in Oikonomia.
 * The manifest (`oikonomia.search`) lists the same fields, and the host drops anything else.
 */
export const oikonomiaSearch: Provider<'search'> = {
  app: 'oikonomia',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['oikonomiaBills'],
  async read(ctx) {
    const bills = await ctx.records<Bill>('oikonomiaBills');
    return bills.map((bill) => {
      const state = standing(bill, ctx.today || localDate());
      return {
        ref: { app: 'oikonomia' as const, kind: 'bill', id: bill.id },
        title: bill.name,
        titleField: 'bill name',
        fields: [
          { name: 'due date', text: formatDate(state.date, 'long') },
          { name: 'paid status', text: state.settled ? 'Paid' : 'Not paid' },
        ],
        at: bill.createdAt,
        label: 'Bill in Oikonomia',
        open: `/oikonomia/?open=${encodeURIComponent(`bill:${bill.id}`)}`,
      };
    });
  },
};
