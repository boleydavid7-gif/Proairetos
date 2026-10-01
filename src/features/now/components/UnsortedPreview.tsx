type Props = {
  count?: number;
};

export default function UnsortedPreview({ count = 0 }: Props) {
  return (
    <section
      aria-label="Unsorted captures"
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
    >
      <h2 className="text-sm text-white/50">Not sorted yet</h2>
      <p className="mt-1 text-white">{count} capture{count === 1 ? "" : "s"}</p>
    </section>
  );
}
