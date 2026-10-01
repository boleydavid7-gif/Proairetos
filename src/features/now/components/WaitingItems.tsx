import type { NowItem } from '../types';

type Props = {
  items: NowItem[];
};

export default function WaitingItems({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Waiting items" className="stack">
      <h2 className="section-label">Waiting</h2>
      {items.map((item) => (
        <div key={item.id} className="card">
          <p className="card__title">{item.title}</p>
          {item.checkBackAt && (
            <p className="card__meta">Check back {new Date(item.checkBackAt).toLocaleDateString()}</p>
          )}
        </div>
      ))}
    </section>
  );
}
