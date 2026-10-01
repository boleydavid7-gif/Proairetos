import { ClockIcon } from '../../../components/icons/Icons';
import { useOverlays } from '../../../app/overlays/OverlayContext';
import ListCard from '../../../components/ui/ListCard';
import type { NowItem } from '../types';

type Props = {
  commitment: NowItem | null;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NextCommitment({ commitment }: Props) {
  const { openItem } = useOverlays();
  if (!commitment) return null;

  return (
    <section aria-label="Next commitment" className="stack-tight">
      <h2 className="section-label">Next commitment</h2>
      <ListCard
        onClick={() => openItem(commitment.id)}
        icon={<ClockIcon size={22} />}
        title={commitment.title}
        detail={commitment.scheduledAt && formatTime(commitment.scheduledAt)}
      />
    </section>
  );
}
