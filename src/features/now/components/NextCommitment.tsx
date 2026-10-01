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
  return (
    <section aria-label="Next commitment" className="now-card">
      <h2 className="now-card__label">Next commitment</h2>
      {commitment ? (
        <>
          <p className="now-card__title">{commitment.title}</p>
          {commitment.scheduledAt && (
            <p className="now-card__meta">{formatTime(commitment.scheduledAt)}</p>
          )}
        </>
      ) : (
        <p className="now-card__meta">No upcoming commitment.</p>
      )}
    </section>
  );
}
