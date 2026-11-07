import { tap } from '../../app/feel';
import { withPayment, type Bill } from '../core/bills';
import { putBill } from '../data/store';
import { newId } from './state';
import { offerUndo } from './undo';
import { actingMember } from './together';

/** Marks a bill paid for one date (at its amount, or what was actually paid), with a few seconds to take it back. */
export async function payBill(bill: Bill, date: string, amountCents = bill.amountCents): Promise<void> {
  tap();
  const paid = withPayment(bill, date, newId(), new Date(), amountCents);
  const by = actingMember();
  await putBill(by ? { ...paid, payments: paid.payments.map((payment, index) => (index === paid.payments.length - 1 && !payment.by ? { ...payment, by } : payment)) } : paid);
  offerUndo(`${bill.name} marked paid`, () => putBill(bill));
}

