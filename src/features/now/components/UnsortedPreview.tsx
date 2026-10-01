type Props = {
  count: number;
};

export default function UnsortedPreview({ count }: Props) {
  if (count === 0) return null;

  return (
    <section aria-label="Unsorted captures" className="card">
      <h2 className="section-label">Not sorted yet</h2>
      <p className="card__title">
        {count} capture{count === 1 ? '' : 's'}
      </p>
      <p className="card__meta">Sort them in Capture whenever you like.</p>
    </section>
  );
}
