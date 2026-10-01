type Props = {
  count?: number;
};

export default function UnsortedPreview({ count = 0 }: Props) {
  return (
    <section aria-label="Unsorted captures">
      <h2>Not sorted yet</h2>
      <p>{count} capture{count === 1 ? "" : "s"}</p>
    </section>
  );
}
