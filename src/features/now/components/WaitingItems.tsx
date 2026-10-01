import { HourglassIcon } from '../../../components/icons/Icons';
import ListCard from '../../../components/ui/ListCard';
import type { NowItem } from '../types';

type Props = {
  items: NowItem[];
};

export default function WaitingItems({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Waiting items" className="stack-tight">
      <h2 className="section-label">Waiting</h2>
      {items.map((item) => (
        <ListCard
          key={item.id}
          icon={<HourglassIcon size={22} />}
          title={item.title}
          detail={item.checkBackAt && `Check back ${new Date(item.checkBackAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
        />
      ))}
    </section>
  );
}
