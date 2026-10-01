import { useOverlays } from '../../../app/overlays/OverlayContext';
import { ClockIcon } from '../../../components/icons/Icons';
import ListCard from '../../../components/ui/ListCard';
import { formatWhen } from '../../items/dateFields';
import type { NowItem } from '../types';

type Props = {
  label: string;
  items: NowItem[];
};

export default function ScheduledItems({ label, items }: Props) {
  const { openItem } = useOverlays();
  if (items.length === 0) return null;

  return (
    <section aria-label={label} className="stack-tight">
      <h2 className="section-label">{label}</h2>
      {items.map((item) => (
        <ListCard
          key={item.id}
          onClick={() => openItem(item.id)}
          icon={<ClockIcon size={22} />}
          title={item.title}
          detail={item.scheduledAt && formatWhen(item.scheduledAt)}
        />
      ))}
    </section>
  );
}
