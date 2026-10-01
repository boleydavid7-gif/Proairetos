import { StarIcon } from '../../../components/icons/Icons';
import { useOverlays } from '../../../app/overlays/OverlayContext';
import ListCard from '../../../components/ui/ListCard';
import type { NowItem } from '../types';

type Props = {
  items: NowItem[];
};

export default function ImportantItems({ items }: Props) {
  const { openItem } = useOverlays();
  if (items.length === 0) return null;

  return (
    <section aria-label="Marked important" className="stack-tight">
      <h2 className="section-label">Marked important</h2>
      {items.map((item) => (
        <ListCard key={item.id} onClick={() => openItem(item.id)} icon={<StarIcon filled size={22} />} title={item.title} />
      ))}
    </section>
  );
}
