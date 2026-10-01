import type { NowItem } from '../types';

type Props = {
  items: NowItem[];
};

export default function WaitingItems({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Waiting items" className="now-section">
      <h2 className="now-card__label">Waiting</h2>
      {items.map((item) => (
        <div key={item.id} className="now-card">
          <p className="now-card__title">{item.title}</p>
          {item.checkBackAt && (
            <p className="now-card__meta">Check back {new Date(item.checkBackAt).toLocaleDateString()}</p>
          )}
        </div>
      ))}
    </section>
  );
}
