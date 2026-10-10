import { tap } from '../../app/feel';
import { withPayment, type Bill } from '../core/bills';
import { putBill } from '../data/store';
import { newId } from './state';
import { offerUndo } from './undo';

/** Marks a bill paid for one date (at its amount, or what was actually paid), with a few seconds to take it back. */
export async function payBill(bill: Bill, date: string, amountCents = bill.amountCents): Promise<void> {
  tap();
  await putBill(withPayment(bill, date, newId(), new Date(), amountCents));
  offerUndo(`${bill.name} marked paid`, () => putBill(bill));
}

