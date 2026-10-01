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
  if (!commitment) return null;

  return (
    <section aria-label="Next commitment" className="card">
      <h2 className="section-label">Next commitment</h2>
      <p className="card__title">{commitment.title}</p>
      {commitment.scheduledAt && <p className="card__meta">{formatTime(commitment.scheduledAt)}</p>}
    </section>
  );
}
