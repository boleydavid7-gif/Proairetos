import { useState } from 'react';
import { InboxIcon } from '../../../components/icons/Icons';
import type { LifeItem } from '../../../core/life-items/types';
import QuickSortSheet from '../../capture/QuickSortSheet';

type Props = {
  count: number;
  items: LifeItem[];
  today: string;
};

/** Things not sorted yet lead to Sort through, which is the one place to sort them. */
export default function UnsortedPreview({ count, items, today }: Props) {
  const [sorting, setSorting] = useState(false);
  if (count === 0) return null;

  return (
    <>
      <button type="button" className="quiet-row" onClick={() => setSorting(true)}>
        <InboxIcon size={22} />
        <span className="quiet-row__text">
          <span>{`${count} not sorted yet`}</span>
          <span className="quiet-row__detail">Sort through them, one at a time, whenever you like.</span>
        </span>
      </button>
      {sorting && <QuickSortSheet items={items} today={today} unsortedFirst onClose={() => setSorting(false)} />}
    </>
  );
}
