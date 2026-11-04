import { useEffect } from 'react';
import { createSharedLists, sharingAvailable, type SharedListRef } from '../../app/family/sharedLists';
import { fingerprint, mergeRecords, type SyncRecord } from '../../app/family/recordMerge';
import { householdActor, householdLists } from '../../app/household/household';
import type { Bill, BillPayment } from '../core/bills';
import type { Spent } from '../core/statements';
import { deleteBill, listBills, loadSettings, putBill } from '../data/store';
import { monthsWithSpent, saveSpent, spentIn } from '../data/spent';

/*
 * Bills and expenses shared with the household (Settings > Household > Bills and expenses). The household's list for
 * this app holds one sealed item per bill and per expense; each phone keeps its own records as always and, while a
 * list is the household's, brings them into step with the shared copy (`mergeRecords`: the side that changed wins, the
 * later edit when both did, a removal carries across). The monthly plan, envelopes, pay and the lines a trip added
 * (`poreia-…`) are never shared. Payments and expenses say who made them.
 */
export type Shared = { id: string; kind: 'bill' | 'spent'; record: SyncRecord['record'] & (Bill | Spent) };

export const oikonomiaLists = createSharedLists<Shared>({
  listsKey: 'oikonomia:household',
  cachePrefix: 'oikonomiaShared',
  label: 'oikonomia-list',
  defaultName: 'Bills',
});

export { sharingAvailable };

/** A shared item is sealed under a size the server allows: the latest payments of a bill go, the older stay on each phone. */
export const PAYMENTS_SHARED = 24;
const sharedId = (kind: Shared['kind'], id: string) => `${kind}:${id}`;
const seenKey = (listId: string) => `oikonomiaShared.seen.${listId}`;
const readSeen = (listId: string): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(seenKey(listId)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
};

/** The household's list for this app on this phone, if it has one. */
export function householdList(): SharedListRef | undefined {
  const ids = householdLists('oikonomia')?.ids ?? [];
  return oikonomiaLists.sharedLists().find((list) => ids.includes(list.id));
}

/** Who is acting, when the bills are the household's; else no name is written. */
export const actingMember = (): string | undefined => (householdList() ? householdActor('oikonomia')?.name : undefined);

export const forSharing = (bill: Bill): Bill => ({ ...bill, payments: bill.payments.slice(-PAYMENTS_SHARED) });

/** Another person's copy of a bill, with this phone's older payments (those before the shared window) kept. */
export function withOlderPayments(theirs: Bill, mine: Bill | undefined): Bill {
  if (!mine || theirs.payments.length < PAYMENTS_SHARED) return theirs;
  const oldest = theirs.payments[0]?.date ?? '';
  const older: BillPayment[] = mine.payments.filter((payment) => payment.date < oldest && !theirs.payments.some((each) => each.id === payment.id));
  return { ...theirs, payments: [...older, ...theirs.payments] };
}

const shareable = (line: Spent) => !line.id.startsWith('poreia-');

async function localRecords(withExpenses: boolean): Promise<Map<string, Shared>> {
  const out = new Map<string, Shared>();
  for (const bill of await listBills()) out.set(sharedId('bill', bill.id), { id: sharedId('bill', bill.id), kind: 'bill', record: forSharing(bill) });
  if (withExpenses) {
    for (const month of monthsWithSpent()) for (const line of spentIn(month)) if (shareable(line)) out.set(sharedId('spent', line.id), { id: sharedId('spent', line.id), kind: 'spent', record: line });
  }
  return out;
}

const monthOf = (line: { date: string }) => line.date.slice(0, 7);

const running = new Map<string, Promise<void>>();

/** Brings the shared copy and this phone's bills and expenses into step, in both directions. */
export function syncHousehold(list: SharedListRef): Promise<void> {
  const already = running.get(list.id);
  if (already) return already;
  const work = (async () => {
    await oikonomiaLists.refreshList(list);
    const withExpenses = loadSettings().shareExpenses !== false;
    const kept = (item: Shared) => withExpenses || item.kind !== 'spent';
    const local = await localRecords(withExpenses);
    const shared = new Map(oikonomiaLists.sharedItems(list).filter(kept).map((item) => [item.id, item]));
    const before = readSeen(list.id);
    // Expenses left out of the household leave nothing to compare, so a later pass starts them afresh, never deleting.
    const seen = withExpenses ? before : Object.fromEntries(Object.entries(before).filter(([key]) => !key.startsWith('spent:')));
    const merge = mergeRecords(local, shared, seen);

    const bills = new Map((await listBills()).map((bill) => [bill.id, bill]));
    const changedMonths = new Map<string, Spent[]>();
    const lines = (month: string) => changedMonths.get(month) ?? [...spentIn(month)];
    const homeOf = new Map<string, string>();
    for (const month of monthsWithSpent()) for (const line of spentIn(month)) homeOf.set(line.id, month);
    const putLine = (line: Spent) => {
      const old = homeOf.get(line.id);
      if (old && old !== monthOf(line)) changedMonths.set(old, lines(old).filter((each) => each.id !== line.id));
      const month = monthOf(line);
      const rest = lines(month).filter((each) => each.id !== line.id);
      changedMonths.set(month, [...rest, line]);
      homeOf.set(line.id, month);
    };
    const dropLine = (id: string) => {
      const month = homeOf.get(id);
      if (month) changedMonths.set(month, lines(month).filter((each) => each.id !== id));
      homeOf.delete(id);
    };

    for (const item of merge.toLocal) {
      if (item.kind === 'bill') await putBill(withOlderPayments(item.record as Bill, bills.get(item.record.id)));
      else putLine(item.record as Spent);
    }
    for (const item of merge.removeLocal) {
      if (item.kind === 'bill') await deleteBill(item.record.id);
      else dropLine(item.record.id);
    }
    for (const [month, next] of changedMonths) saveSpent(month, next);
    for (const item of merge.toShared) oikonomiaLists.changeItem(list, item.id, item);
    for (const id of merge.removeShared) oikonomiaLists.changeItem(list, id, null);
    try {
      localStorage.setItem(seenKey(list.id), JSON.stringify(merge.seen));
    } catch {
      // Storage full: the next pass compares again.
    }
  })().finally(() => running.delete(list.id));
  running.set(list.id, work);
  return work;
}

/** While the app is open: the household's bills are brought into step when something here changed, and pulled every 20 seconds in view. */
export function useBillSharing(): void {
  useEffect(() => {
    if (!sharingAvailable) return;
    let last = '';
    let pulled = 0;
    let stopped = false;
    const pass = async () => {
      if (document.visibilityState !== 'visible') return;
      const list = householdList();
      if (!list) return;
      const due = Date.now() - pulled > 20_000;
      const now = fingerprint([...(await localRecords(loadSettings().shareExpenses !== false)).values()]);
      if (stopped || (!due && now === last)) return;
      last = now;
      if (due) pulled = Date.now();
      await syncHousehold(list).catch(() => undefined);
    };
    void pass();
    const timer = window.setInterval(() => void pass(), 4_000);
    const onView = () => void pass();
    document.addEventListener('visibilitychange', onView);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onView);
    };
  }, []);
}
