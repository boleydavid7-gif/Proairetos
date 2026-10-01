type Props = {
  count: number;
};

export default function UnsortedPreview({ count }: Props) {
  if (count === 0) return null;

  return (
    <section aria-label="Unsorted captures" className="now-card">
      <h2 className="now-card__label">Not sorted yet</h2>
      <p className="now-card__title">
        {count} capture{count === 1 ? '' : 's'}
      </p>
    </section>
  );
}
