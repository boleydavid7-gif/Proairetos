import { useEffect, useRef, useState, type ReactNode } from 'react';
import { tap } from '../../app/feel';
import { withPayment, type Bill } from '../core/bills';
import { putBill } from '../data/store';
import { newId } from './state';

/**
 * Marking a bill paid for one date, with a few seconds to take it back. Returns the function to call and
 * the small bar to render.
 */
export function usePayBill(): { pay: (bill: Bill, date: string) => Promise<void>; toast: ReactNode } {
  const [undo, setUndo] = useState<{ message: string; run: () => Promise<void> } | null>(null);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pay = async (bill: Bill, date: string) => {
    tap();
    await putBill(withPayment(bill, date, newId()));
    window.clearTimeout(timer.current);
    setUndo({
      message: `${bill.name} marked paid`,
      run: async () => {
        await putBill(bill);
        setUndo(null);
      },
    });
    timer.current = window.setTimeout(() => setUndo(null), 7000);
  };

  const toast = undo ? (
    <div className="oiko-toast" role="status">
      <span>{undo.message}</span>
      <button type="button" onClick={() => void undo.run()}>
        Undo
      </button>
    </div>
  ) : null;

  return { pay, toast };
}
