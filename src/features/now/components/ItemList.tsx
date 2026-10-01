import type { NowItem } from '../types';

type Props = {
  label: string;
  items: NowItem[];
};

export default function ItemList({ label, items }: Props) {
  if (items.length === 0) return null;

  return (
    <section aria-label={label} className="stack">
      <h2 className="section-label">{label}</h2>
      {items.map((item) => (
        <div key={item.id} className="card">
          <p className="card__title">{item.title}</p>
        </div>
      ))}
    </section>
  );
}
